import 'dotenv/config'
import { Client } from 'discord.js'
import { setupEvents } from './events/registerEvents'
import { getConfigFromDatabase, initializeDatabase } from './utils/databaseManager';

export const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})

await initializeDatabase();
export const config = await getConfigFromDatabase();

await setupEvents()

client.login(config.BOT.Token)