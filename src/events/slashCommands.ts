import { SlashCommandBuilder } from "discord.js"
import { client } from "../index.js"

export async function setupSlashCommands() {
    if (client.application){
        await client.application.commands.create(OpenDM)
        await client.application.commands.create(Investment)
        await client.application.commands.create(Profit)
        await client.application.commands.create(Exit)
        await client.application.commands.create(FirstExit)
        await client.application.commands.create(Foder)
        await client.application.commands.create(TOTW)
        await client.application.commands.create(TeamSuggest)
        await client.application.commands.create(FAQ)
        await client.application.commands.create(DeleteInvestment)
        await client.application.commands.create(VIP)
        await client.application.commands.create(SyncVIP)
        await client.application.commands.create(SyncVIPForUser)
    }
}

const OpenDM = new SlashCommandBuilder()
    .setName('open-dm')
    .setDescription('פתיחת צאט פרטי עם משתמש')
    .addUserOption(option =>
        option.setName('משתמש')
              .setDescription('המשתמש שאיתו יפתח החדר הפרטי')
              .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('פעולה')
            .setDescription('בחר אם לפתוח או לסגור צאט')
            .setRequired(true)
            .addChoices(
                { name: 'פתח צאט', value: 'open' },
                { name: 'סגור צאט', value: 'close' }
            )
    )

const Investment = new SlashCommandBuilder()
    .setName('investment')
    .setDescription('פרסום השקעה חדשה בצאט הנוכחי')
    .addStringOption(option => 
        option.setName('שחקן')
              .setDescription('שם השחקן לביצוע חיפוש')
              .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('סיכון')
            .setDescription('בחר את רמת הסיכון')
            .setRequired(true)
            .addChoices(
                { name: 'נמוך', value: '🟢 נמוך 🟢' },
                { name: 'בינוני', value: '🟠 בינוני 🟠' },
                { name: 'גבוה', value: '🔴 גבוה 🔴' },
                { name: 'מסוכן מאוד', value: '⛔ מסוכן מאוד ⛔' }
            )
    )
    .addIntegerOption(option =>
        option.setName('חיסור-מחיר')
              .setDescription('בכמה פחות לקנות את השחקן')
              .setRequired(true)
    )
    
const Profit = new SlashCommandBuilder()
    .setName('profit')
    .setDescription('פרסום הודעה של רווחים על השקעה מסויימת')
    .addStringOption(option =>
        option.setName('הודעה')
            .setDescription('הודעה שתשלח יחד עם ההודעת רווחים')
            .setRequired(true)
    )


const Exit = new SlashCommandBuilder()
    .setName('exit')
    .setDescription('שליחת הודעה על יציאה ללא רווח')
    .addStringOption(option =>
        option.setName('הודעה')
            .setDescription('הודעה שתשלח יחד עם ההודעת יציאה')
            .setRequired(true)
    )

const FirstExit = new SlashCommandBuilder()
    .setName('first-exit')
    .setDescription('שליחת הודעה על יציאה ראשונה')
    .addStringOption(option =>
        option.setName('הודעה')
            .setDescription('הודעה שתשלח יחד עם ההודעת יציאה ראשונה')
            .setRequired(true)
    )

const Foder = new SlashCommandBuilder()
    .setName('foder')
    .setDescription('פרסום השקעה חדשה של פודרים בצאט הנוכחי')
    .addIntegerOption(option =>
        option.setName('רייטינג')
            .setDescription('בחר את הרייטינג')
            .setRequired(true)
            .addChoices(
                { name: '81', value: 81 },
                { name: '82', value: 82 },
                { name: '83', value: 83 },
                { name: '84', value: 84 },
                { name: '85', value: 85 },
                { name: '86', value: 86 },
                { name: '87', value: 87 },
                { name: '88', value: 88 },
                { name: '89', value: 89 },
                { name: '90', value: 90 },
                { name: '91', value: 91 }
            )
    )
    .addStringOption(option =>
        option.setName('סיכון')
            .setDescription('בחר את רמת הסיכון')
            .setRequired(true)
            .addChoices(
                { name: 'נמוך', value: '🟢 נמוך 🟢' },
                { name: 'בינוני', value: '🟠 בינוני 🟠' },
                { name: 'גבוה', value: '🔴 גבוה 🔴' },
                { name: 'מסוכן מאוד', value: '⛔ מסוכן מאוד ⛔' }
            )
    )
    .addIntegerOption(option =>
        option.setName('חיסור-מחיר')
              .setDescription('בכמה פחות לקנות את השחקן')
              .setRequired(true)
    )

const TOTW = new SlashCommandBuilder()
    .setName('totw')
    .setDescription('פרסום השקעה חדשה של פודרים אינפורם בצאט הנוכחי')
    .addIntegerOption(option =>
        option.setName('רייטינג')
            .setDescription('בחר את הרייטינג')
            .setRequired(true)
            .addChoices(
                { name: '81', value: 81 },
                { name: '82', value: 82 },
                { name: '83', value: 83 },
                { name: '84', value: 84 },
                { name: '85', value: 85 },
                { name: '86', value: 86 },
                { name: '87', value: 87 },
                { name: '88', value: 88 },
                { name: '89', value: 89 },
                { name: '90', value: 90 },
                { name: '91', value: 91 }
            )
    )
    .addStringOption(option =>
        option.setName('סיכון')
            .setDescription('בחר את רמת הסיכון')
            .setRequired(true)
            .addChoices(
                { name: 'נמוך', value: '🟢 נמוך 🟢' },
                { name: 'בינוני', value: '🟠 בינוני 🟠' },
                { name: 'גבוה', value: '🔴 גבוה 🔴' },
                { name: 'מסוכן מאוד', value: '⛔ מסוכן מאוד ⛔' }
            )
    )
    .addIntegerOption(option =>
        option.setName('חיסור-מחיר')
              .setDescription('בכמה פחות לקנות את השחקן')
              .setRequired(true)
    )

const TeamSuggest = new SlashCommandBuilder()
    .setName('team-suggest')
    .setDescription('פתיחה או סגירה של צאט שדרוג קבוצות')
    .addStringOption(option =>
        option.setName('פעולה')
            .setDescription('בחר אם לפתוח או לסגור צאט')
            .setRequired(true)
            .addChoices(
                { name: 'פתח צאט', value: 'open' },
                { name: 'סגור צאט', value: 'close' }
            )
    )
    .addStringOption(option =>
        option.setName('קבוצות')
            .setDescription('כמה קבוצות להגריל')
    )

const FAQ = new SlashCommandBuilder()
    .setName('faq-new')
    .setDescription('הוספת שאלה נפוצה עם תשובה')
    .addStringOption(option =>
        option.setName('שאלה')
            .setDescription('מה השאלה')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('תשובה')
            .setDescription('מה התשובה')
            .setRequired(true)
    )

const DeleteInvestment = new SlashCommandBuilder()
    .setName('delete_investment')
    .setDescription('מחיקת השקעה מהמסד נתונים')

const VIP = new SlashCommandBuilder()
    .setName('vip')
    .setDescription('פקודה לקבלת רול פרימיום')

const SyncVIP = new SlashCommandBuilder()
    .setName('sync_vip')
    .setDescription('ביצוע סנכרון לכלל חברי הפרימיום')

const SyncVIPForUser = new SlashCommandBuilder()
    .setName('sync_user')
    .setDescription('ביצוע סנכרון לכלל חברי הפרימיום')
    .addUserOption(option =>
        option.setName('משתמש')
              .setDescription('שעליו לבצע את הסנכרון')
              .setRequired(true)
    )