import { EmbedBuilder, Guild, Message, User, TextChannel, NewsChannel } from 'discord.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { config, client } from '../index.js';

// Function to send embed messages to the specified channel
const sendEmbed = async (channelId: string, embed: EmbedBuilder) => {
	const channel = await client.channels.fetch(channelId)
	if (channel instanceof TextChannel || channel instanceof NewsChannel) {
		await channel.send({ embeds: [embed] });
	} else {
		console.warn(`Channel with ID ${channelId} is not a text or news channel.`);
	}
};

// Helper function to safely get a string or undefined from possibly null values
const getSafeURL = (url: string | null | undefined): string | undefined => {
	return url ?? undefined;
};

// Embed for message edits
export const messageEditEmbed = withErrorHandling(async (before: Message, after: Message) => {
	if (!after.guild) {
		console.warn('Message edit event from non-guild context');
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle('📝 הודעה נערכה 📝')
		.setColor('#cc9600')
		.setTimestamp()
		.setFooter({ text: after.guild.name, iconURL: getSafeURL(after.guild.iconURL()) })
		.addFields(
			{ name: '👤 משתמש 👤', value: `${after.author}` },
			{ name: '📫 צאט 📫', value: `${after.channel}` },
			{ name: '⬅️ הודעה לפני ⬅️', value: `\`\`\`${before.content}\`\`\`` },
			{ name: '➡️ הודעה אחרי ➡️', value: `\`\`\`${after.content}\`\`\`` },
		);

	if (after.author.displayAvatarURL()) {
		embed.setThumbnail(after.author.displayAvatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

// Embed for message deletions
export const messageDeleteEmbed = withErrorHandling(async (message: Message) => {
	if (!message.guild) {
		console.warn('Message delete event from non-guild context');
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle('🗑️ הודעה נמחקה 🗑️')
		.setColor('#cc9600')
		.setTimestamp()
		.setFooter({ text: message.guild.name, iconURL: getSafeURL(message.guild.iconURL()) })
		.addFields(
			{ name: '👤 משתמש 👤', value: `${message.author}` },
			{ name: '💬 הודעה 💬', value: `\`\`\`${message.content}\`\`\`` },
			{ name: '📫 צאט 📫', value: `${message.channel}` },
		);

	if (message.attachments.size > 0) {
		embed.setImage(message.attachments.first()?.url ?? '');
	}

	if (message.author.displayAvatarURL()) {
		embed.setThumbnail(message.author.displayAvatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

// Embed for member bans
export const memberBanEmbed = withErrorHandling(async (guild: Guild, user: User) => {
	const embed = new EmbedBuilder()
		.setTitle('⛔ משתמש קיבל באן! ⛔')
		.setColor('#fe4848')
		.setTimestamp()
		.setFooter({ text: guild.name, iconURL: getSafeURL(guild.iconURL()) })
		.addFields({ name: '👤 משתמש 👤', value: `${user}` });

	if (user.displayAvatarURL()) {
		embed.setThumbnail(user.displayAvatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

// Embed for member unbans
export const memberUnbanEmbed = withErrorHandling(async (guild: Guild, user: User) => {
	const embed = new EmbedBuilder()
		.setTitle('✅ ירד למשתמש באן ✅')
		.setColor('#fe4848')
		.setTimestamp()
		.setFooter({ text: guild.name, iconURL: getSafeURL(guild.iconURL()) })
		.addFields({ name: '👤 משתמש 👤', value: `${user}` });

	if (user.displayAvatarURL()) {
		embed.setThumbnail(user.displayAvatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

// Embed for member timeouts
export const memberTimeoutEmbed = withErrorHandling(async (guild: Guild, user: User) => {
	const embed = new EmbedBuilder()
		.setTitle('⌛ משתמש קיבל טיימאוט ⌛️')
		.setColor('#fb7979')
		.setTimestamp()
		.setFooter({ text: guild.name, iconURL: getSafeURL(guild.iconURL()) })
		.addFields({ name: '👤 משתמש 👤', value: `${user}` });

	if (user.displayAvatarURL()) {
		embed.setThumbnail(user.displayAvatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});
