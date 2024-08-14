import { ActionRowBuilder, APIAttachment, Attachment, AttachmentBuilder, AttachmentPayload, BufferResolvable, CommandInteraction, JSONEncodable, Message, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextChannel } from "discord.js"
import { withErrorHandling } from "../utils/errorHandler"
import { getFutbinFoderPageData, getFutbinPlayerPageData, getFutbinTOTWPageData, getPageContent } from "../utils/puppeteerManager"
import * as cheerio from 'cheerio'
import axios from "axios"
import { dbManager } from "../utils/databaseManager"
import { client, config } from "../index"
import { Stream } from "stream"
import { generateTrackerButtons, notifyInvestmentTracker } from "./investmentTracker"

const RETRIES = 5

export const createNewInvestment = withErrorHandling(async (interaction: CommandInteraction) => {
    const playerSearchName = interaction.options.get('שחקן')?.value?.toString()
    const investmentRisk = interaction.options.get('סיכון')?.value?.toString()
    const priceDifference = (interaction.options.get('חיסור-מחיר')?.value)?.toString().replace(/\D/g, '')
    if (playerSearchName && investmentRisk && priceDifference){
        await interaction.reply({ content: 'מבצע חיפוש לשחקן, אנא המתן...', ephemeral: true })
        const url = `https://www.futbin.com/players?search=${encodeURI(playerSearchName)}`
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
            const components: ActionRowBuilder<StringSelectMenuBuilder>[] = []
            for(let i=0; i<menusOptions.length; i++){
                components.push(new ActionRowBuilder<StringSelectMenuBuilder>())
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`new_investment_pick_player_${i}`)
                    .setPlaceholder(`רשימת תוצאות ${i+1}`)
                    .addOptions(menusOptions[i].map(player => 
                            new StringSelectMenuOptionBuilder()
                            .setLabel(player.label)
                            .setValue(JSON.stringify({ url: player.value, risk: investmentRisk, priceDiff: priceDifference }))
                        )
                    );
                components[i].addComponents(selectMenu)
            }
            await interaction.editReply({ content: 'בחר שחקן', components: components })
        } else{
            await interaction.editReply({ content: 'לא נמצא שחקן עם שם זה' })
        }
    }
})

export const postNewInvestment = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    const paramsData = JSON.parse(interaction.values[0])
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`, components: [] })
    let pageData = await getFutbinPlayerPageData('https://www.futbin.com' + paramsData.url)
        for (let i=0; i<RETRIES; i++) {
            if (pageData && pageData.country && pageData.pricePC && pageData.minPCPrice && pageData.priceConsole && pageData.minConsolePrice) {
                break
            }
            pageData = await getFutbinPlayerPageData('https://www.futbin.com' + paramsData.url)
        }
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
        const everyoneRole = interaction.guild?.roles.everyone
        const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${pageData.rating} ${flagEmoji}\n\n` +
            `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
            `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
            `${paramsData.risk}\n` +
            `||${interaction.user} **מפרסם ההשקעה** ||\n` +
            `**||${everyoneRole}||**`;
        const msg = await interaction.channel?.send({ content: formattedText, files: [pageData.image] });
        let isVIP = false
        if (interaction.channel instanceof TextChannel && everyoneRole) {
            const channelPerms = interaction.channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (channelPerms && channelPerms.deny.has(PermissionFlagsBits.ViewChannel)) {
                isVIP = true
            }
        }
        if (msg) {
            const insertedData = await dbManager.Investments.createNewInvestment(pageData.name, 'https://www.futbin.com' + paramsData.url, pageData.country, pageData.rating, pageData.card, paramsData.risk, interaction.channelId, priceConsoleLabel, pricePCLabel, interaction.user.id, msg.id, isVIP)
            await msg.edit({ components: [await generateTrackerButtons(insertedData.insertedId.toString())] })
        }
    }
})

export const sendInvestmentListPicker = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ content: 'משיג מידע על כל ההשקעות...', ephemeral: true });
    let customID = 'post_profit_pick_player'
    if (interaction.commandName === 'first-exit') {
        customID = 'first_exit_pick_player'
    } else if (interaction.commandName === 'exit') {
        customID = 'early_exit_pick_player'
    }
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
    const components: ActionRowBuilder<StringSelectMenuBuilder>[] = []
    for(let i=0; i<menusOptions.length; i++){
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>())
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(customID)
            .setPlaceholder(`רשימת תוצאות ${i+1}`)
            .addOptions(menusOptions[i].map(player => 
                    new StringSelectMenuOptionBuilder()
                    .setLabel(player.label)
                    .setValue(JSON.stringify({ id: player.value, message: messageInput }))
                )
            );
        components[i].addComponents(selectMenu)
    }
    await interaction.editReply({ content: 'בחר השקעה', components: components })
})

export const postProfitMessage = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של הרווחים`, components: [] })
    const commandData = JSON.parse(interaction.values[0])
    const investmentData = await dbManager.Investments.getInvestmentByID(commandData.id)
    if (investmentData){
        let pageData = await checkWhatFunctionToRun(investmentData)
        for (let i=0; i<RETRIES; i++) {
            if (pageData?.pricePC && pageData.priceConsole && pageData.image) {
                break
            }
            pageData = await checkWhatFunctionToRun(investmentData)
        }
        if (pageData?.pricePC && pageData.priceConsole && pageData.image) {
            const flagEmoji = await countryNameToFlag(investmentData.nation)
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
            let formattedText = `## ${flagEmoji} ${investmentData.name.toUpperCase()} ${investmentData.rating} ${flagEmoji}\n\n` +
                `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** +${profitConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${config.BOT.Emoji.PC} **:** +${profitPCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${commandData.message}\n`
            if (investmentData.vip) {
                formattedText += `\n**:money_with_wings:השקעה זו עלתה רק לחברי המועדון:money_with_wings:**\n` +
                    `איך אתם יכולים להיכנס?\n` +
                    `כל הפרטים כאן:point_down:\n` +
                    `https://discord.com/channels/919996404368306227/1271487467727360022\n`
            }
            formattedText += `\n**||${interaction.guild?.roles.everyone}||**`;
            
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
                    const profitMsg = await profitChannel.send({ content: formattedText, files });
                    await notifyInvestmentTracker(profitMsg, commandData.id)
                }
                await dbManager.Investments.deleteInvestmentByID(commandData.id)
            }
        }
    }
})

export const postFirstExitMessage = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של יציאה ראשונה`, components: [] })
    const commandData = JSON.parse(interaction.values[0])
    const investmentData = await dbManager.Investments.getInvestmentByID(commandData.id)
    if (investmentData){
        let pageData = await checkWhatFunctionToRun(investmentData)
        for (let i=0; i<RETRIES; i++) {
            if (pageData?.image) {
                break
            }
            pageData = await checkWhatFunctionToRun(investmentData)
        }
        if (pageData?.image) {
            const flagEmoji = await countryNameToFlag(investmentData.nation)
            const formattedText = `## ✅ יציאה ראשונה ✅\n` +
                `### ${flagEmoji} ${investmentData.name.toUpperCase()} ${investmentData.rating} ${flagEmoji}\n` +
                `${commandData.message}\n` +
                `**||${interaction.guild?.roles.everyone}||**`;
            if (investmentData.vip) {
                const exitChannel = await client.channels.fetch(config.SERVER.CHANNELS.FirstExit.VIP.toString())
                if (exitChannel instanceof TextChannel) {
                    const msg = await exitChannel.send({ content: formattedText, files: [pageData.image] });
                    await notifyInvestmentTracker(msg, commandData.id)
                }
            } else {
                const exitChannel = await client.channels.fetch(config.SERVER.CHANNELS.FirstExit.everyone.toString())
                if (exitChannel instanceof TextChannel) {
                    const msg = await exitChannel.send({ content: formattedText, files: [pageData.image] });
                    await notifyInvestmentTracker(msg, commandData.id)
                }
            }
            
        }
    }
})

export const postEarlyExitMessage = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של יציאה מוקדמת`, components: [] })
    const commandData = JSON.parse(interaction.values[0])
    const investmentData = await dbManager.Investments.getInvestmentByID(commandData.id)
    if (investmentData){
        let pageData = await checkWhatFunctionToRun(investmentData)
        for (let i=0; i<RETRIES; i++) {
            if (pageData?.image) {
                break
            }
            pageData = await checkWhatFunctionToRun(investmentData)
        }
        if (pageData?.image) {
            const flagEmoji = await countryNameToFlag(investmentData.nation)
            const formattedText = `## זמן למכור\n` +
                `### ${flagEmoji} ${investmentData.name.toUpperCase()} ${investmentData.rating} ${flagEmoji}\n` +
                `${commandData.message}\n` +
                `**||${interaction.guild?.roles.everyone}||**`;
            
            if (investmentData.vip) {
                const exitChannel = await client.channels.fetch(config.SERVER.CHANNELS.FirstExit.VIP.toString())
                if (exitChannel instanceof TextChannel) {
                    const msg = await exitChannel.send({ content: formattedText, files: [pageData.image] });
                    await notifyInvestmentTracker(msg, commandData.id)
                }
            } else {
                const exitChannel = await client.channels.fetch(config.SERVER.CHANNELS.FirstExit.everyone.toString())
                if (exitChannel instanceof TextChannel) {
                    const msg = await exitChannel.send({ content: formattedText, files: [pageData.image] });
                    await notifyInvestmentTracker(msg, commandData.id)
                }
            }
            await dbManager.Investments.deleteInvestmentByID(commandData.id)
        }
    }
})

export const postNewFoderInvestment = withErrorHandling(async (interaction: CommandInteraction) => {
    const foderRatingString = interaction.options.get('רייטינג')?.value?.toString()
    const investmentRisk = interaction.options.get('סיכון')?.value?.toString()
    const priceDiff = interaction.options.get('חיסור-מחיר')?.value?.toString()
    await interaction.reply({ content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`, components: [], ephemeral: true })
    if (foderRatingString) {
        const foderRating = parseInt(foderRatingString)
        let pageData = await getFutbinFoderPageData(foderRating)
        for (let i=0; i<RETRIES; i++) {
            if (pageData && pageData.country && pageData.pricePC && priceDiff && investmentRisk && pageData.minPCPrice && pageData.priceConsole && pageData.minConsolePrice) {
                break
            }
            pageData = await getFutbinFoderPageData(foderRating)
        }
        if (pageData && pageData.country && pageData.pricePC && priceDiff && investmentRisk && pageData.minPCPrice && pageData.priceConsole && pageData.minConsolePrice) {
            const flagEmoji = await countryNameToFlag(pageData.country)
            const pricePC = parseInt(pageData.pricePC.replace(/\D/g, '')) - parseInt(priceDiff)
            let pricePCLabel = pricePC.toLocaleString()
            if (pricePC < parseInt(pageData.minPCPrice.toString())){
                pricePCLabel = parseInt(pageData.minPCPrice.toString()).toLocaleString()
            }
            const priceConsole = parseInt(pageData.priceConsole.replace(/\D/g, '')) - parseInt(priceDiff)
            let priceConsoleLabel = priceConsole.toLocaleString()
            if (priceConsole < parseInt(pageData.minConsolePrice.toString())){
                priceConsoleLabel = parseInt(pageData.minConsolePrice.toString()).toLocaleString()
            }
            const everyoneRole = interaction.guild?.roles.everyone
            const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${flagEmoji}\n\n` +
                `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${investmentRisk}\n` +
                `||${interaction.user} **מפרסם ההשקעה** ||\n` +
                `**||${everyoneRole}||**`;
    
            const msg = await interaction.channel?.send({ content: formattedText, files: [pageData.image] });
            let isVIP = false
            if (interaction.channel instanceof TextChannel && everyoneRole) {
                const channelPerms = interaction.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (channelPerms && channelPerms.deny.has(PermissionFlagsBits.ViewChannel)) {
                    isVIP = true
                }
            }
            if (msg) {
                const insertedData = await dbManager.Investments.createNewInvestment(pageData.name, 'https://www.futbin.com/stc/cheapest', pageData.country, '', 'פודר', investmentRisk, interaction.channelId, priceConsoleLabel, pricePCLabel, interaction.user.id, msg.id, isVIP)
                await msg.edit({ components: [await generateTrackerButtons(insertedData.insertedId.toString())] })
            }
        } else {
            await interaction.editReply({ content: 'הייתה שגיאה עם יצירת ההודעה, אנא נסה שוב' })
        }
    }
})

export const postNewTOTWInvestment = withErrorHandling(async (interaction: CommandInteraction) => {
    const foderRatingString = interaction.options.get('רייטינג')?.value?.toString()
    const investmentRisk = interaction.options.get('סיכון')?.value?.toString()
    const priceDiff = interaction.options.get('חיסור-מחיר')?.value?.toString()
    await interaction.reply({ content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`, components: [], ephemeral: true })
    if (foderRatingString) {
        const foderRating = parseInt(foderRatingString)
        let pageData = await getFutbinTOTWPageData(foderRating)
        for (let i=0; i<RETRIES; i++) {
            if (pageData && pageData.country && pageData.pricePC && priceDiff && investmentRisk && pageData.minPCPrice && pageData.priceConsole && pageData.minConsolePrice) {
                break
            }
            pageData = await getFutbinTOTWPageData(foderRating)
        }
        if (pageData && pageData.country && pageData.pricePC && priceDiff && investmentRisk && pageData.minPCPrice && pageData.priceConsole && pageData.minConsolePrice) {
            const flagEmoji = await countryNameToFlag(pageData.country)
            const pricePC = parseInt(pageData.pricePC.replace(/\D/g, '')) - parseInt(priceDiff)
            let pricePCLabel = pricePC.toLocaleString()
            if (pricePC < parseInt(pageData.minPCPrice.toString())){
                pricePCLabel = parseInt(pageData.minPCPrice.toString()).toLocaleString()
            }
            const priceConsole = parseInt(pageData.priceConsole.replace(/\D/g, '')) - parseInt(priceDiff)
            let priceConsoleLabel = priceConsole.toLocaleString()
            if (priceConsole < parseInt(pageData.minConsolePrice.toString())){
                priceConsoleLabel = parseInt(pageData.minConsolePrice.toString()).toLocaleString()
            }
            const everyoneRole = interaction.guild?.roles.everyone
            const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${flagEmoji}\n\n` +
                `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
                `${investmentRisk}\n` +
                `||${interaction.user} **מפרסם ההשקעה** ||\n` +
                `**||${everyoneRole}||**`;
            
            const msg = await interaction.channel?.send({ content: formattedText, files: [pageData.image] });
            let isVIP = false
            if (interaction.channel instanceof TextChannel && everyoneRole) {
                const channelPerms = interaction.channel.permissionOverwrites.cache.get(everyoneRole.id);
                if (channelPerms && channelPerms.deny.has(PermissionFlagsBits.ViewChannel)) {
                    isVIP = true
                }
            }
            if (msg) {
                const insertedData = await dbManager.Investments.createNewInvestment(pageData.name, 'https://www.futbin.com/stc/cheapest', pageData.country, '', 'פודר', investmentRisk, interaction.channelId, priceConsoleLabel, pricePCLabel, interaction.user.id, msg.id, isVIP)
                await msg.edit({ components: [await generateTrackerButtons(insertedData.insertedId.toString())] })
            }
        } else {
            await interaction.editReply({ content: 'הייתה שגיאה עם יצירת ההודעה, אנא נסה שוב' })
        }
    }
})

export const countryNameToFlag = async (countryName: string) => {
    try {
        if (countryName === 'TOTW Inform') {
            return config.BOT.Emoji.TOTW.toString()
        } else if (countryName === 'Gold Foder') {
            return '✨'
        }
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

const checkWhatFunctionToRun = withErrorHandling(async (data: any) => {
    if (data.version === 'פודר') {
        if (data.name.toString().includes(' TOTW ')) {
            return await getFutbinTOTWPageData(parseInt(data.name.toString().split(' ')[0]))
        } else {
            return await getFutbinFoderPageData(parseInt(data.name.toString().split(' ')[0]))
        }
    } else {
        return await getFutbinPlayerPageData(data.link)
    }
})