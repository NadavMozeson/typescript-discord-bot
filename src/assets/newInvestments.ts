import { ActionRowBuilder, AttachmentBuilder, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js"
import { withErrorHandling } from "../utils/errorHandler"
import { getFutbinPlayerPageData, getPageContent } from "../utils/puppeteerManager"
import * as cheerio from 'cheerio'
import axios from "axios"
import { dbManager } from "../utils/databaseManager"

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
    }
})

export const postNewInvestment = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    const paramsData = JSON.parse(interaction.values[0])
    await interaction.update({ content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`, components: [] })
    const pageData = await getFutbinPlayerPageData('https://www.futbin.com' + paramsData.url)
    if (pageData?.country && pageData.pricePC && pageData.priceConsole && pageData.name && pageData.rating && pageData.card) {
        const flagEmoji = await countryNameToFlag(pageData.country)
        const pricePC = parseInt(pageData.pricePC.replace(/\D/g, '')) - parseInt(paramsData.priceDiff)
        const priceConsole = parseInt(pageData.priceConsole.replace(/\D/g, '')) - parseInt(paramsData.priceDiff)
        const formattedText = `## ${flagEmoji} ${pageData.name.toUpperCase()} ${pageData.rating} ${flagEmoji}\n\n` +
            `<:xbox:1058695385545191474><:playstation:1058695383712268308> **:** ${priceConsole.toLocaleString()} <:coins:1074026310197854289>\n` +
            `<:windows:1058696799478620160> **:** ${pricePC.toLocaleString()} <:coins:1074026310197854289>\n` +
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