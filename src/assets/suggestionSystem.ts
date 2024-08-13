import { Message } from "discord.js";
import { withErrorHandling } from "../utils/errorHandler";
import { config } from "../index"

export const handleSuggestion = withErrorHandling(async (message: Message) => {
    if (message.channelId === config.SERVER.CHANNELS.Suggest.toString()) {
        if (!(config.SERVER.INFO.Owners.includes(message.author.id))) {
            await sendSuggestion(message)
            await message.delete()
        }
    }
})

const sendSuggestion = withErrorHandling(async (message: Message) => {
    if (message.guild) {
        const channel = await message.guild.channels.fetch(config.SERVER.CHANNELS.Suggest.toString())
        if (channel && channel.isTextBased()) {
            await channel.send({ content: `${message.author}:\n${message.content}` })
        }
    }
})