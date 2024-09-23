import { ButtonInteraction, CategoryChannel, ChannelType, PermissionsBitField, TextChannel } from 'discord.js';
import { config, client } from '../index';
import { withErrorHandling } from '../utils/errorHandler';
import { dbManager } from '../utils/databaseManager';
import { openTicketEmbed, closeTicketLogEmbed, newTicketEmbed } from '../components/ticketEmbeds';

export const setupTicketSystem = withErrorHandling(async () => {
    await openTicketEmbed()
})

export const createNewTicket = withErrorHandling(async (interaction: ButtonInteraction, reason: string) => {
    if (await dbManager.Tickets.checkIfTicketExists(interaction.user.id)){
        const channel = await interaction.guild?.channels.fetch(await dbManager.Tickets.getTicketChannel(interaction.user.id))
        await interaction.reply({
            content: `||${interaction.user}||\n**יש לך כבר טיקט פתוח:**\n${channel}`,
            ephemeral: true
        })
        return
    }
    if (!interaction.guild?.channels.cache.find(category => category.name === '📩 | אזור טיקטים | 📩')){
        const temp_cat = await interaction.guild?.channels.create({
            name: '📩 | אזור טיקטים | 📩',
            type: ChannelType.GuildCategory
        })
        await temp_cat?.setPosition(0)
    }
    const category = interaction.guild?.channels.cache.find(category => category.name === '📩 | אזור טיקטים | 📩')
    if (category){
        const ticketChannel = await interaction.guild?.channels.create({
            name: `טיקט-${interaction.user.displayName}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild?.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: config.SERVER.ROLES.Support.toString(), 
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        if (ticketChannel){
            await interaction.reply({
                content: `||${interaction.user}||\n**נפתח לך טיקט:**\n${ticketChannel}`,
                ephemeral: true
            })
            if (reason.includes('giveaway')) {
                await newTicketEmbed(interaction.user.id, ticketChannel.id, 'הגרלה')
            } else if (reason.includes('vip')) {
                await newTicketEmbed(interaction.user.id, ticketChannel.id, 'רכישת VIP')
            } else if (reason.includes('rules')) {
                await newTicketEmbed(interaction.user.id, ticketChannel.id, 'הפרת חוקים')
            } else {
                await newTicketEmbed(interaction.user.id, ticketChannel.id, 'כללי')
            }
            await dbManager.Tickets.createNewTicket(interaction.user.id, ticketChannel.id)
        }
    }
})

export const confirmTicketClose = withErrorHandling(async (interaction: ButtonInteraction) => {
    await closeTicketLogEmbed(interaction)
    await dbManager.Tickets.deleteTicket(interaction.channelId.toString())
    await interaction.channel?.delete()
    const category = interaction.guild?.channels.cache.find(category => category.name === '📩 | אזור טיקטים | 📩')
    if (category instanceof CategoryChannel) {
        if (category.children.cache.size === 0) {
            await category.delete()
        }
    }
})