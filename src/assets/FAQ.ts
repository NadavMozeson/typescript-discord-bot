import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { config, client } from '../index';
import { withErrorHandling } from '../utils/errorHandler';
import { dbManager } from '../utils/databaseManager';

export const handleNewFAQ = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ ephemeral: true, content: 'מוסיף הודעה למאגר...' })
    const question = interaction.options.get('שאלה')?.value?.toString()
    const answer = interaction.options.get('תשובה')?.value?.toString()
    if (question && answer) {
        if((await dbManager.FAQ.createNewQuestion(question, answer)).acknowledged) {
            await addAllButtons()
            await interaction.editReply({ content: 'הוסיף את השאלה למאגר בהצלחה' })
        } else {
            await interaction.editReply({ content: 'נכשל בהוספת שאלה למאגר' })
        }
    }
})

export const handleNewFAQClick = withErrorHandling(async (interaction: ButtonInteraction) => {
    await interaction.reply({ ephemeral: true, content: 'משיג תשובה מהמסד נתונים...' })
    const id = interaction.customId.split('faq-click-')[1]
    const data = await dbManager.FAQ.getAnswer(id)
    if (data && data.answer && data.question) {
        const result = `## ${data.question}\n${data.answer}`
        await interaction.editReply({ content: result })
    } else {
        await interaction.editReply({ content: 'התקבלה שגיאה בהשגת התשובה, אנא נסה שוב' })
    }
})

export const handleFAQMessage = withErrorHandling(async () => {
    await getFAQMessage()
    await addAllButtons()
})

const getFAQMessage = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.FAQ)
    if (channel instanceof TextChannel) {
        const messages = await channel.messages.fetch()
        if (messages.size === 0) {
            await createFAQMessage()
        }
        return messages.last()
    }
})

const createFAQMessage = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.FAQ)
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
    const embed = new EmbedBuilder()
        .setTitle('שאלות נפוצות')
        .setDescription('יש מספר רב של שאלות שאנחנו מקבלים וחוזרות על עצמן.\nבשביל זה פתחנו את צאט זה לקבלת תשובות בצורה מהירה\nלחצו למטה על כפתור אשר אתם מעוניינים לקבל את תשובתו👇')
        .setColor(0xff5252)
        .setAuthor({ name: `${guild.name}`, iconURL: `${guild.iconURL()}` });
    if (channel instanceof TextChannel) {
        await channel.send({ embeds: [embed] })
    }
})

const addAllButtons = withErrorHandling(async () => {
    const msg = await getFAQMessage()
    if (msg instanceof Message) {
        const allQuestionsData = await dbManager.FAQ.getAllQuestions()
        const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
        for (const question of allQuestionsData) {
            const tempButton = new ButtonBuilder()
                .setCustomId(`faq-click-${question._id}`)
                .setLabel(question.question)
                .setStyle(ButtonStyle.Secondary)
            buttonsRow.addComponents(tempButton)
        }
        if (buttonsRow.components.length > 0 && buttonsRow.components.length < 6){
            console.log(msg.editable)
            await msg.edit({ components: [buttonsRow] })
        }
    }
})