import { Message } from 'discord.js';
import { config } from '../index';
import { withErrorHandling } from '../utils/errorHandler';

export const handleVotingMessage = withErrorHandling(async (message: Message) => {
    if (config.SERVER.CHANNELS.VotingChannel.includes(message.channelId.toString())) {
        await message.react(config.BOT.Emoji.Like)
        await message.react(config.BOT.Emoji.Dislike)
    }
})