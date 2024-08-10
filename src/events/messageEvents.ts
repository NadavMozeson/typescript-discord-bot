import { Message, PartialMessage } from 'discord.js';
import { withErrorHandling } from '../utils/errorHandler';
import { client, config } from '../index';
import { isUserOwner, sendMessage } from '../utils/helperFunctions';
import { messageDeleteEmbed, messageEditEmbed } from '../components/logsEmbed';

export async function setupMessagesEvents() {
	client.on(
		'messageCreate',
		withErrorHandling(async (message: Message) => {
            if ((message.channelId.toString() === config.SERVER.CHANNELS.Suggest.toString()) && !await isUserOwner(message.author) && !message.author.bot) {
                const SuggestLog = await client.channels.fetch(message.channelId)
                await sendMessage(`${message.author}: ${message.content}`, SuggestLog)
            }
		}),
	);

    client.on(
		'messageDelete',
		withErrorHandling(async (message: Message | PartialMessage) => {
            if (message.author){
                if ((message.channelId.toString() !== config.SERVER.CHANNELS.Suggest.toString()) && !message.author.bot) {
                    await messageDeleteEmbed(message)
                }
            }
		}),
	);

    client.on(
		'messageUpdate',
		withErrorHandling(async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
            if (oldMessage.author){
                if (!oldMessage.author.bot) {
                    await messageEditEmbed(oldMessage, newMessage)
                }
            }
		}),
	);
}
