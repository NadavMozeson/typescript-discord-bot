import 'dotenv/config'
import { Client } from 'discord.js'
import { setupBasicEvents } from './events/basicEvents'
import { getConfigFromDatabase, initializeDatabase } from './utils/databaseManager';

export const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})

await initializeDatabase();
export const config = await getConfigFromDatabase();

await setupBasicEvents()

client.login(config.BOT.Token)