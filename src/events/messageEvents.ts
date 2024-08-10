import { Message, NewsChannel, TextChannel } from 'discord.js';
import { withErrorHandling } from '../utils/errorHandler';
import { client, config } from '../index';
import { isUserOwner, sendMessage } from '../utils/helperFunctions';

export async function setupMessagesEvents() {
	client.on(
		'messageCreate',
		withErrorHandling(async (message: Message) => {
            if ((message.channelId.toString() === config.SERVER.CHANNELS.Suggest.toString()) && !await isUserOwner(message.author) && !message.author.bot) {
                console.log('Not authorized to send')
                const SuggestLog = await client.channels.fetch(message.channelId)
                await sendMessage(`${message.author}: ${message.content}`, SuggestLog)
            }
		}),
	);
}
