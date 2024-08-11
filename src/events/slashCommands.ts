import { SlashCommandBuilder } from "discord.js"
import { client } from "../index"

export async function setupSlashCommands() {
    if (client.application){
        await client.application.commands.create(OpenDM)
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
