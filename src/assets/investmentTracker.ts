import { withErrorHandling } from "../utils/errorHandler"
import { client, config } from "../index"
import { dbManager } from "../utils/databaseManager"
import { countryNameToFlag } from "./newInvestments"
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Message, TextChannel } from "discord.js"

export const updateTrackerMessage = withErrorHandling(async () => {
    const allChannel = await client.channels.fetch(config.SERVER.CHANNELS.InvestmentTracker.everyone.toString())
    const vipChannel = await client.channels.fetch(config.SERVER.CHANNELS.InvestmentTracker.VIP.toString())
    let allMessage = '# מעקב השקעות'
    let vipMessage = '# מעקב השקעות'
    const investmentsData = await dbManager.Investments.getAllInvestment()
    if (investmentsData) {
        investmentsData.sort((a, b) => {
            if (a.vip === b.vip) {
                return 0;
            }
            return a.vip ? 1 : -1;
        });
        for (const item of investmentsData) {
            if (item.vip) {
                allMessage += '\n### ████████████ ██ :pirate_flag:' 
                vipMessage += `\n### ${item.name} ${item.rating} ${await countryNameToFlag(item.nation)}\nhttps://discord.com/channels/${config.SERVER.INFO.ServerId}/${item.channel}/${item.msg}`
            } else {
                allMessage += `\n### ${item.name} ${item.rating} ${await countryNameToFlag(item.nation)}\nhttps://discord.com/channels/${config.SERVER.INFO.ServerId}/${item.channel}/${item.msg}`
                vipMessage += `\n### ${item.name} ${item.rating} ${await countryNameToFlag(item.nation)}\nhttps://discord.com/channels/${config.SERVER.INFO.ServerId}/${item.channel}/${item.msg}`
            }
        }
        allMessage += '\n\n *ההשקעות המחוקות זמינות רק לחברי המועדון שלנו*'
        if (allChannel instanceof TextChannel){
            const lastAllMessage = (await allChannel.messages.fetch({ limit: 1 })).first()
            if (lastAllMessage){
                if (lastAllMessage.editable) {
                    await lastAllMessage.edit({ content: allMessage })
                } else {
                    await allChannel.send({ content: allMessage })
                }
            } else {
                await allChannel.send({ content: allMessage })
            }
        } 
        if (vipChannel instanceof TextChannel){
            const lastVIPMessage = (await vipChannel.messages.fetch({ limit: 1 })).first()
            if (lastVIPMessage){
                if (lastVIPMessage.editable) {
                    await lastVIPMessage.edit({ content: vipMessage })
                } else {
                    await vipChannel.send({ content: vipMessage })
                }
            } else {
                await vipChannel.send({ content: vipMessage })
            }
        } 
    }
})

export const generateTrackerButtons = withErrorHandling(async (id: string) => {
    const buttonAdd = new ButtonBuilder()
      .setCustomId(`tracker_button_add_${id}`)
      .setLabel('ביצוע מעקב')
      .setStyle(ButtonStyle.Success);

    const buttonRemove = new ButtonBuilder()
      .setCustomId(`tracker_button_remove_${id}`)
      .setLabel('הסרת מעקב')
      .setStyle(ButtonStyle.Danger);
    
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(buttonAdd, buttonRemove);
    
    return actionRow
})

export const handelTrackerButtonClick = withErrorHandling(async (interaction: ButtonInteraction) => {
    const member = interaction.guild?.members.fetch(interaction.user.id);
    if (member) {
        if (!(await member).roles.cache.has(config.SERVER.ROLES.VIP.toString())){
            await interaction.reply({ content: '️⚠️ רק לחברי מועדון יש גישה למעקב ⚠', ephemeral: true })
            return
        }
        if (interaction.customId.toString().includes('_add_')){
            const investmentID = interaction.customId.toString().split('tracker_button_add_')[1]
            if (investmentID){
                if (await dbManager.InvestmentsTracker.checkIfExists(interaction.user.id.toString(), investmentID.toString())){
                    await interaction.reply({ content: '❕ כבר יש לך מעקב אחרי השקעה זו ❕', ephemeral: true })
                } else {
                    await dbManager.InvestmentsTracker.createNewTracker(interaction.user.id.toString(), investmentID.toString())
                    await interaction.reply({ content: '✅ ההשקעה נוספה לרשימת מעקב שלך ✅', ephemeral: true })
                }
            }
        } else if (interaction.customId.toString().includes('_remove_')) {
            const investmentID = await interaction.customId.toString().split('tracker_button_remove_')[1]
            if (investmentID){
                if (await dbManager.InvestmentsTracker.checkIfExists(interaction.user.id.toString(), investmentID.toString())){
                    await dbManager.InvestmentsTracker.deleteTracker(interaction.user.id.toString(), investmentID.toString())
                    await interaction.reply({ content: '❌ ההשקעה ירדה מרשימת המעקב שלך ❌', ephemeral: true })
                } else {
                    await interaction.reply({ content: '❕ אין לך מעקב אחרי השקעה זו ❕', ephemeral: true })
                }
            }
        }
    }
})

export const notifyInvestmentTracker = withErrorHandling(async (message: Message, investmentID: string) => {
    const resultData = await dbManager.InvestmentsTracker.getAllTrackerOfInvestment(investmentID)
    if (resultData){
        for (const asset of resultData) {
            const user = await client.users.fetch(asset.user.toString())
            if (user) {
                try {
                    await user.send({ content: message.content, components: message.components, files:  Array.from(message.attachments.values()) });
                } catch (error) {
                    continue
                }
            }
        }
    }
})

export const disableInvestmentButtons = withErrorHandling(async (investmentID: string) => {
    const investmentData = await dbManager.Investments.getInvestmentByID(investmentID)
    if (investmentData) {
        const channel = await client.channels.fetch(investmentData.channel.toString())
        if (channel && channel instanceof TextChannel) {
            const message = await channel.messages.fetch(investmentData.msg.toString())
            const buttonAdd = new ButtonBuilder()
                .setCustomId(`disabled_add_tracker_button_${investmentID}`)
                .setLabel('ביצוע מעקב')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);
      
            const buttonRemove = new ButtonBuilder()
                .setCustomId(`disabled_remove_tracker_button_${investmentID}`)
                .setLabel('הסרת מעקב')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);
            
            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(buttonAdd, buttonRemove);
            await message.edit({ components: [actionRow] })
        }
    }
})