import { Message } from 'discord.js';
import { config } from '../index.js';
import { withErrorHandling } from '../utils/errorHandler.js';

export const handleVotingMessage = withErrorHandling(async (message: Message) => {
    if (config.SERVER.CHANNELS.VotingChannel.includes(message.channelId.toString())) {
        await message.react(config.BOT.Emoji.Like)
        await message.react(config.BOT.Emoji.Dislike)
    }
})