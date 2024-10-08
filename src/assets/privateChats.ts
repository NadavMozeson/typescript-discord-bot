import { CategoryChannel, ChannelType, CommandInteraction, PermissionsBitField, TextChannel, User } from "discord.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { dbManager } from "../utils/databaseManager.js";
import { client, config } from "../index.js"
import { newVIPMember } from "../components/logsEmbed.js";

export const handleOpenDMInteraction = withErrorHandling(async (interaction: CommandInteraction) => {
    const user = interaction.options.get('משתמש')?.user
    if (user) {
        const action = interaction.options.get('פעולה')?.value
        if (action === 'open') {
            await createPrivateChat(user, false)
            await interaction.reply({
                content: `נפתח צאט פרטי עם המשתמש ${user}`,
                ephemeral: true
            })
        }else if (action === 'close') {
            await deletePrivateChat(user)
            await interaction.reply({
                content: `נסגר צאט פרטי עם המשתמש ${user}`,
                ephemeral: true
            })
        }
    }
})

export const createPrivateChat = withErrorHandling(async (user: User, isVIP: boolean) => {
    if (!(await dbManager.DM.checkIfChatExists(user.id))) {
        const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString());

        let categories = guild.channels.cache.filter(category => category.name.startsWith('🔒 | צאטים פרטיים | 🔒') && category.type === ChannelType.GuildCategory && category.children.cache.size  < 1);
        let category = null;
        if (categories.size === 0) {
            category = await guild.channels.create({
                name: '🔒 | צאטים פרטיים | 🔒',
                type: ChannelType.GuildCategory
            });
            await category?.setPosition(0);
        } else {
            category = categories.first()
        }
        if (category) {
            const dmChannel = await guild.channels.create({
                name: `${user.username} צאט פרטי`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    }
                ],
            });
    
            if (dmChannel) {
                const message = `שלום ${user},\n` +
                                "תודה רבה על תמיכתך בערוץ וברוך הבא לקבוצת חברי המועדון שלנו!\n" +
                                "בצאט זה אתה יכול לשלוח לנו הודעות בצורה פרטנית ולקבל מענה באופן אישי על כל שאלה או מחשבה.\n" +
                                "בנוסף, זמינים לך החדרים במתחם החברי מועדון שלנו. מוזמן לטייל שם ולראות תוכן אשר זמין רק לכם!\n" +
                                "שוב, ברוך הבא ותודה על תמיכתך❤️";
                await dmChannel.send(message);
                await dbManager.DM.createNewChat(user.id, dmChannel.id, isVIP);
            }
        }      
    }
});


export const deletePrivateChat = withErrorHandling(async (user: User) => {
    if (await dbManager.DM.checkIfChatExists(user.id)) {
        const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString())
        const channelId = await dbManager.DM.getChatChannel(user.id)
        if (channelId) {
            const allChannels = await guild.channels.fetch()
            if (allChannels.has(channelId.toString())) {
                const channel = allChannels.get(channelId.toString())
                if (channel instanceof TextChannel){
                    const category = channel.parent
                    await channel.delete()
                    await dbManager.DM.deleteChat(channelId)
                    if (category instanceof CategoryChannel) {
                        if (category.children.cache.size === 0) {
                            await category.delete()
                        }
                    }
                }
            } 
        } else {
            await dbManager.DM.deleteChat(channelId)
        }
    }
})