import { withErrorHandling } from "../utils/errorHandler"
import { client, config } from "../index"
import { AttachmentBuilder, CommandInteraction, GuildMember, Message, PermissionsBitField, TextChannel } from "discord.js"

export const handleTeamSuggest = withErrorHandling(async (interaction: CommandInteraction) => {
    const action = interaction.options.get('פעולה')?.value
    if (action === 'open') {
        await interaction.reply({ ephemeral: true, content: 'פותח את הצאט' })
        await deleteAllMessages()
        await sendStartMessage()
        await allowMessages()
        await interaction.editReply({ content: 'החדר שדרוג קבוצות נפתח' })
    } else {
        await interaction.reply({ ephemeral: true, content: 'סוגר את הצאט' })
        const inputData = interaction.options.get('קבוצות')?.value?.toString()
        if (inputData) {
            await preformRaffle(parseInt(inputData), interaction)
        } else {
            await preformRaffle(10, interaction)
        }
        await denyMessages()
        await interaction.editReply({ content: 'החדר שדרוג קבוצות נסגר' })
    }
})

const sendStartMessage = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.TeamRating)
    if (channel instanceof TextChannel) {
        const messageString = '# ⚒⚒️ מדריך לדירוג קבוצות ⚒️\n' +
        '1. ציינו את התקציב שיש לכם בצד לשיפור הקבוצה 🤑\n' +
        '2. ציינו את האנטריידים שבקבוצתכם 🚫\n' +
        '3. ציינו את המערך בו אתם משחקים בתחילת המשחק 🔢\n' +
        '4. ציינו את השחקנים שתרצו להחליף ואת השחקנים שלא תסכימו להחליף ♻️\n' +
        '5. בנוסף צרפו צילום מסך של הקבוצה שלכם **__מהפוטבין__ עם אנטריידים מסומנים** ⏰\n\n' +
        '**הערה:** כל הסעיפים חייבים להיות ממוספרים ומסודרים כך: 1. 2. 3. ...\n\n' +
        '**✅ רק מי שישלח את קבוצתו לפי התבנית המדויקת שלמעלה יכנס לדירוג**\n' +
        '**הודעה אחת כל 6 שעות בלבד! עשה זאת כך, אחרת לא תרשם במערכת**\n\n' +
        `||${channel.guild.roles.everyone}||`
        const attachment = new AttachmentBuilder('./src/images/team-rating-banner.jpg')
        await channel.send({ content: messageString, files: [attachment] })
    }
})

const allowMessages = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.TeamRating)
    if (channel instanceof TextChannel){
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            SendMessages: true
        });
    }
})

const denyMessages = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.TeamRating)
    if (channel instanceof TextChannel){
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            SendMessages: false
        });
    }
})

const deleteAllMessages = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.TeamRating)
    if (channel instanceof TextChannel) {
        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const fetchedMessages = await channel.messages.fetch();
        const recentMessages = fetchedMessages.filter(msg => msg.createdTimestamp > fourteenDaysAgo);
        await channel.bulkDelete(recentMessages);
        const oldFetchedMessages = fetchedMessages.filter(msg => msg.createdTimestamp <= fourteenDaysAgo);
        for (const message of oldFetchedMessages.values()) {    
            if (message instanceof Message) {
                await message.delete()
            }
        }
    }
})

const preformRaffle = withErrorHandling(async (amount: number, interaction: CommandInteraction) => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.TeamRating)
    if (channel instanceof TextChannel) {
        const raffledMessages: [string, Message<true>][] = []
        const messages = Array.from(await channel.messages.fetch())
        const allMessages: [string, Message<true>][] = []
        const vipMessages: [string, Message<true>][] = []
        for (const msg of messages) {
            const user = await msg[1].guild.members.fetch(msg[1].author.id)
            if (user instanceof GuildMember) {
                if (!user.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    if (user.roles.cache.has(config.SERVER.ROLES.VIP)) {
                        vipMessages.push(msg)
                    }
                    allMessages.push(msg)
                }                
            }
        }
        let amountVIP = vipMessages.length
        if (amountVIP >= Math.ceil(amount * 0.33)) {
            amountVIP = Math.ceil(amount * 0.33)
        } 
        for (let i = 0; i < amountVIP; i++) {
            const index = Math.floor(Math.random() * vipMessages.length)
            raffledMessages.push(vipMessages[index])
            vipMessages.slice(index, 1)
        }
        for (let i = 0; i < (amount-amountVIP); i++) {
            const index = Math.floor(Math.random() * allMessages.length)
            raffledMessages.push(allMessages[index])
            allMessages.slice(index, 1)
        }
        let msgContent = 'הקבוצות אשר נבחרו הן:'
        for (const msg of raffledMessages) {
            msgContent += `\n${msg[1].url}`
        }
        await interaction.followUp({ ephemeral: true, content: msgContent })
    }
})