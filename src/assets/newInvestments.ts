import { ActionRowBuilder, APIAttachment, Attachment, AttachmentBuilder, AttachmentPayload, BufferResolvable, CommandInteraction, JSONEncodable, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextChannel } from "discord.js"
import { withErrorHandling } from "../utils/errorHandler"
import { getFutbinPlayerPageData, getPageContent } from "../utils/puppeteerManager"
import * as cheerio from 'cheerio'
import axios from "axios"
import { dbManager } from "../utils/databaseManager"
import { client, config } from "../index"
import { Stream } from "stream"

export const createNewInvestment = withErrorHandling(async (interaction: CommandInteraction) => {
    const playerSearchName = interaction.options.get('שחקן')?.value?.toString()
    const investmentRisk = interaction.options.get('סיכון')?.value?.toString()
    const priceDifference = (interaction.options.get('חיסור-מחיר')?.value)?.toString().replace(/\D/g, '')
    if (playerSearchName && investmentRisk && priceDifference){
        await interaction.reply({ content: 'מבצע חיפוש לשחקן, אנא המתן...', ephemeral: true })
        const url = `https://www.futbin.com/players?page=1&search=${playerSearchName}`
        const content = await getPageContent(url)
        const $ = cheerio.load(content)
        const results: { label:string, value: string }[] = []
    
        const playerTable = $('#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody');
        const children = playerTable.children()
        children.each((_, row) => {
            const playerRow = $(row)
            
            const player = {
                name: playerRow.find('.table-player-name').text(),
                rating: playerRow.find('.player-rating-card-text').text(),
                card: playerRow.find('.table-player-revision').text(),
                price: playerRow.find('.table-price.platform-ps-only .price').text(),
                url: playerRow.find('.table-player-name').attr('href')
            };
            if (player.url) {
                results.push({ label: `${player.name}(${player.rating}) - ${player.card} - ${player.price}`, value: player.url })
            }
        })
        if (results.length > 0) {
            const menusOptions: { label:string, value: string }[][] = []
            for(let i=0; i<results.length; i += 20){
                menusOptions.push(results.slice(i, i + 20))
            }
            const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            for(let i=0; i<menusOptions.length; i++){
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('new_investment_pick_player')
                    .setPlaceholder(`רשימת תוצאות ${i+1}`)
                    .addOptions(menusOptions[i].map(player => 
                            new StringSelectMenuOptionBuilder()
                            .setLabel(player.label)
                            .setValue(JSON.stringify({ url: player.value, risk: investmentRisk, priceDiff: priceDifference }))
                        )
                    );
                actionRow.addComponents(selectMenu)
            }
            await interaction.editReply({ content: 'בחר שחקן', components: [actionRow] })
        } else{
            await interaction.editReply({ content: 'לא נמצא שחקן עם שם זה' })
        }
    }
})

export const postNewInvestment = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    const paramsData = JSON.parse(interaction.values[0])
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`, components: [] })
    const pageData = await getFutbinPlayerPageData('https://www.futbin.com' + paramsData.url)
    if (pageData?.country && pageData.minPCPrice && pageData.minConsolePrice && pageData.pricePC && pageData.priceConsole && pageData.name && pageData.rating && pageData.card) {
        const flagEmoji = await countryNameToFlag(pageData.country)
        const pricePC = parseInt(pageData.pricePC.replace(/\D/g, '')) - parseInt(paramsData.priceDiff)
        let pricePCLabel = pricePC.toLocaleString()
        if (pricePC < parseInt(pageData.minPCPrice.toString())){
            pricePCLabel = parseInt(pageData.minPCPrice.toString()).toLocaleString()
        }
        const priceConsole = parseInt(pageData.priceConsole.replace(/\D/g, '')) - parseInt(paramsData.priceDiff)
        let priceConsoleLabel = priceConsole.toLocaleString()
        if (priceConsole < parseInt(pageData.minConsolePrice.toString())){
            priceConsoleLabel = parseInt(pageData.minConsolePrice.toString()).toLocaleString()
        }
        const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${pageData.rating} ${flagEmoji}\n\n` +
            `<:xboxicon:1272444398776483910><:psicon:1272444386382184468> **:** ${priceConsoleLabel} <:fifa_coins:1272443460388913202>\n` +
            `<:pcicon:1272443581738520577> **:** ${pricePCLabel} <:fifa_coins:1272443460388913202>\n` +
            `${paramsData.risk}\n` +
            `||${interaction.user} **מפרסם ההשקעה** ||\n` +
            `**||${interaction.guild?.roles.everyone}||**`;

        const msg = await interaction.channel?.send({ content: formattedText, files: [pageData.image] });
        if (msg) {
            await dbManager.Investments.createNewInvestment(pageData.name, 'https://www.futbin.com' + paramsData.url, pageData.country, pageData.rating, pageData.card, paramsData.risk, interaction.channelId, priceConsole.toString(), pricePC.toString(), interaction.user.id, msg.id)
        }
    }
})

const countryNameToFlag = async (countryName: string) => {
    try {
        const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`);
        const countryData: {altSpellings: string}[] = response.data;
    
        if (countryData.length > 0) {
          const firstAltSpelling = countryData[0].altSpellings[0].toUpperCase();
          return firstAltSpelling
            .split('')
            .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 'A'.charCodeAt(0)))
            .join('');
        }
        return null;
    } catch (error) {
        return 'Error fetching flag';
    }
};

export const sendProfitMessage = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ content: 'משיג מידע על כל ההשקעות...', ephemeral: true });
    const messageInput = interaction.options.get('הודעה')?.value?.toString()
    const allInvestmentsData = (await dbManager.Investments.getAllInvestment())
    const result: { label:string, value: string }[] = []
    for (const investment of allInvestmentsData) {
        result.push({ label: `${investment.name}(${investment.rating}) - ${investment.version}`, value: investment._id.toString() })
    }
    const menusOptions: { label:string, value: string }[][] = []
    for(let i=0; i<allInvestmentsData.length; i += 20){
        menusOptions.push(result.slice(i, i + 20))
    }
    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    for(let i=0; i<menusOptions.length; i++){
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('post_profit_pick_player')
            .setPlaceholder(`רשימת תוצאות ${i+1}`)
            .addOptions(menusOptions[i].map(player => 
                    new StringSelectMenuOptionBuilder()
                    .setLabel(player.label)
                    .setValue(JSON.stringify({ id: player.value, message: messageInput }))
                )
            );
        actionRow.addComponents(selectMenu)
    }
    await interaction.editReply({ content: 'בחר השקעה', components: [actionRow] })
})

export const postProfitMessage = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של הרווחים`, components: [] })
    const commandData = JSON.parse(interaction.values[0])
    const investmentData = await dbManager.Investments.getInvestmentByID(commandData.id)
    if (investmentData){
        const pageData = await getFutbinPlayerPageData(investmentData.link)
        if (pageData?.country && pageData.pricePC && pageData.priceConsole && pageData.name && pageData.rating && pageData.card) {
            const flagEmoji = await countryNameToFlag(pageData.country)
            const profitPC = parseInt(pageData.pricePC.replace(/\D/g, '')) - parseInt(investmentData['pc price'])
            let profitPCLabel = ''
            if (profitPC > 0) {
                profitPCLabel = profitPC.toLocaleString()
            } else {
                profitPCLabel = '❌'
            }
            const profitConsole = parseInt(pageData.priceConsole.replace(/\D/g, '')) - parseInt(investmentData['console price'])
            let profitConsoleLabel = ''
            if (profitConsole > 0) {
                profitConsoleLabel = profitConsole.toLocaleString()
            } else {
                profitConsoleLabel = '❌'
            }
            const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${pageData.rating} ${flagEmoji}\n\n` +
                `<:xboxicon:1272444398776483910><:psicon:1272444386382184468> **:** +${profitConsoleLabel} <:fifa_coins:1272443460388913202>\n` +
                `<:pcicon:1272443581738520577> **:** +${profitPCLabel} <:fifa_coins:1272443460388913202>\n` +
                `${commandData.message}\n` +
                `**||${interaction.guild?.roles.everyone}||**`;
            
            const channel = await client.channels.fetch(investmentData.channel.toString())
            if (channel instanceof TextChannel) {
                const msg = await channel.messages.fetch(investmentData.msg.toString())
                const attachment = msg.attachments.first();
                const files: (Attachment | BufferResolvable | Stream | JSONEncodable<APIAttachment> | AttachmentBuilder | AttachmentPayload)[] = [pageData.image];
                if (attachment) {
                    files.push(attachment);
                }
                const profitChannel = await client.channels.fetch(config.SERVER.CHANNELS.Profit.toString())
                if (profitChannel instanceof TextChannel) {
                    await profitChannel.send({ content: formattedText, files });
                }
                await dbManager.Investments.deleteInvestmentByID(commandData.id)
            }
        }
    }
})