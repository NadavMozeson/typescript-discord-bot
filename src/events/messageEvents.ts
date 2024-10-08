import { Message, PartialMessage } from 'discord.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { client, config } from '../index.js';
import { messageDeleteEmbed, messageEditEmbed } from '../components/logsEmbed.js';
import { handleSuggestion } from '../assets/suggestionSystem.js';
import { handleVotingMessage } from '../assets/votingReaction.js';

export async function setupMessagesEvents() {
	client.on(
		'messageCreate',
		withErrorHandling(async (message: Message) => {
            await handleSuggestion(message)
            await handleVotingMessage(message)
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
