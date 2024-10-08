import { EmbedBuilder, Interaction, ButtonBuilder, ActionRowBuilder, ButtonStyle, TextChannel, NewsChannel, ButtonInteraction } from 'discord.js';
import { sendPlainEmbed } from './embedsBuilder.js';
import { config, client } from '../index.js'
import { withErrorHandling } from '../utils/errorHandler.js';

export const openTicketEmbed = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.Ticket.toString())
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString())
    const embed = new EmbedBuilder()
        .setTitle('פתיחת טיקט חדש!')
        .setDescription('אין לפתוח טיקט שאינו קשור ל**תמיכה טכנית בלבד** בנוגע לשרת הדיסקורד!\nכמו כן, אין לפתוח טיקט על בקשה להשקעות או עצות.\n\nעל מנת לפתוח טיקט יש ללחוץ על הכפתור למטה👇')
        .setColor(0xff5252)
        .setAuthor({ name: `${guild.name}`, iconURL: `${guild.iconURL()}` });

    const regularButton = new ButtonBuilder()
        .setCustomId('ticket-create-button-regular')
        .setLabel('פתיחת טיקט בנושא טכני בלבד')
        .setEmoji('📨')
        .setStyle(ButtonStyle.Secondary)

    const vipButton = new ButtonBuilder()
        .setCustomId('ticket-create-button-vip')
        .setLabel('VIP תמיכה בנוגע לרכישת חבר')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Secondary)

    const giveawayButton = new ButtonBuilder()
        .setCustomId('ticket-create-button-giveaway')
        .setLabel('תמיכה בנוגע להגרלה')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Secondary)

    const rulesButton = new ButtonBuilder()
        .setCustomId('ticket-create-button-rules')
        .setLabel('תמיכה בנוגע למשתמש אשר הפר את אחד מחוקי השרת')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary)

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(regularButton, vipButton, giveawayButton, rulesButton);
        
    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
        await channel.messages.fetch()
        if (channel.lastMessage === null){
            await channel.send({ embeds: [embed], components: [buttonsRow] });
        } 
	} else {
		console.warn(`Channel with ID ${config.SERVER.CHANNELS.Ticket} is not a text or news channel.`);
	}
})

export const newTicketEmbed = withErrorHandling(async (userID: string, channelID: string, reason: string) =>{
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString());
    const channel = await guild.channels.fetch(channelID);
    const user = await client.users.fetch(userID);
    const embed = new EmbedBuilder()
        .setTitle('טיקט חדש!')
        .setDescription('נשמח אם תוכל לשלוח בנתיים פרטים בנוגע לפנייה, כך שנציג יוכל לתת לך מענה בצורה המיטבית')
        .setColor(0xff5252)
        .setTimestamp()
        .addFields(
            { name: 'בעלים של הטיקט', value: `${user}` },
            { name: 'סוג הטיקט', value: `${reason}` }
        )
        .setAuthor({ name: `${guild.name}`, iconURL: `${guild.iconURL()}` });

    const closeButton = new ButtonBuilder()
        .setCustomId(`close-ticket-${channelID}`)
        .setLabel('סגור את הטיקט')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton);
    
    if (channel && channel instanceof TextChannel){
        await channel.send({ content: `||${user}||`, embeds: [embed], components: [buttonsRow] });
    }
})

export const confirmTicketCloseMessage = withErrorHandling(async (interaction: ButtonInteraction) => {
    const channelID = (interaction.customId.toString().split('close-ticket-'))[1]
    
    const closeButton = new ButtonBuilder()
        .setCustomId(`confirm-close-ticket-${channelID}`)
        .setLabel('סגור את הטיקט')
        .setStyle(ButtonStyle.Danger)

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton);

    await interaction.reply({
        content: 'האם אתה בטוח שאתה רוצה לסגור את הטיקט הנוכחי?',
        components: [buttonsRow],
        ephemeral: true
    })
})

export const closeTicketLogEmbed = async (interaction: Interaction) => {
    const channelID = interaction.channelId
    if (channelID) {
        const channel = await interaction.guild?.channels.fetch(channelID.toString())
        const embed = new EmbedBuilder()
        .setTitle('📪 נסגר טיקט! 📪')
        .setColor(0xff5252)
        .setTimestamp()
        .setFooter({ text: `${interaction.guild?.name}`, iconURL: `${interaction.guild?.iconURL()}` })
        .addFields(
            { name: '💬 שם הטיקט 💬', value: `${channel?.name}` },
            { name: '👤 נסגר על ידי 👤', value: `${interaction.user}` }
        )
        .setAuthor({ name: `${interaction.guild?.name}`, iconURL: `${interaction.guild?.iconURL()}` });

        await sendPlainEmbed(config.SERVER.CHANNELS.LOG.Main, embed)
    }
}