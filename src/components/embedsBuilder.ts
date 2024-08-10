import { EmbedBuilder, TextChannel, NewsChannel, ActionRowBuilder } from 'discord.js';
import { client } from '../index.js';

export const sendPlainEmbed = async (channelId: string, embed: EmbedBuilder) => {
	const channel = await client.channels.fetch(channelId)
	if (channel instanceof TextChannel || channel instanceof NewsChannel) {
		await channel.send({ embeds: [embed] });
	} else {
		console.warn(`Channel with ID ${channelId} is not a text or news channel.`);
	}
};

export const sendAdvancedEmbed = async (channelId: string, embed: EmbedBuilder, components: any, content = '') => {
	const channel = await client.channels.fetch(channelId)
	if (channel instanceof TextChannel || channel instanceof NewsChannel) {
		await channel.send({ content: content, embeds: [embed], components: components });
	} else {
		console.warn(`Channel with ID ${channelId} is not a text or news channel.`);
	}
};

export const getSafeURL = (url: string | null | undefined): string | undefined => {
	return url ?? undefined;
};