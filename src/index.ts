import 'dotenv/config'
import { Client } from 'discord.js'
import { setupBasicEvents } from './events/basicEvents'

export const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})

await setupBasicEvents()

client.login(process.env.DISCORD_TOKEN)