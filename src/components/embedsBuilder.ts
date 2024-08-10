import { EmbedBuilder, Guild, Message, User, TextChannel, NewsChannel, GuildMember, PartialMessage } from 'discord.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { config, client } from '../index.js';

const sendEmbed = async (channelId: string, embed: EmbedBuilder) => {
	const channel = await client.channels.fetch(channelId)
	if (channel instanceof TextChannel || channel instanceof NewsChannel) {
		await channel.send({ embeds: [embed] });
	} else {
		console.warn(`Channel with ID ${channelId} is not a text or news channel.`);
	}
};

const getSafeURL = (url: string | null | undefined): string | undefined => {
	return url ?? undefined;
};

export const messageEditEmbed = withErrorHandling(async (before: Message | PartialMessage, after: Message | PartialMessage) => {
	if (!after.guild) {
		console.warn('Message edit event from non-guild context');
		return;
	}
    
    if (!after.author) {
		console.warn('Message edit event from non-user context');
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

export const messageDeleteEmbed = withErrorHandling(async (message: Message | PartialMessage) => {
	if (!message.guild) {
		console.warn('Message delete event from non-guild context');
		return;
	}
        
    if (!message.author) {
		console.warn('Message edit event from non-user context');
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

export const memberBanEmbed = withErrorHandling(async (guild: Guild, user: { bot: boolean; id: string; }) => {
	const userData = await client.users.fetch(user.id)
    const embed = new EmbedBuilder()
		.setTitle('⛔ משתמש קיבל באן! ⛔')
		.setColor('#fe4848')
		.setTimestamp()
		.setFooter({ text: guild.name, iconURL: getSafeURL(guild.iconURL()) })
		.addFields({ name: '👤 משתמש 👤', value: `${userData}` });

	if (userData.avatarURL()) {
		embed.setThumbnail(userData.avatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

export const memberUnbanEmbed = withErrorHandling(async (guild: Guild, user: { bot: boolean; id: string; }) => {
    const userData = await client.users.fetch(user.id)
	const embed = new EmbedBuilder()
		.setTitle('✅ ירד למשתמש באן ✅')
		.setColor('#fe4848')
		.setTimestamp()
		.setFooter({ text: guild.name, iconURL: getSafeURL(guild.iconURL()) })
		.addFields({ name: '👤 משתמש 👤', value: `${userData}` });

	if (userData.avatarURL()) {
		embed.setThumbnail(userData.avatarURL());
	}

	await sendEmbed(config.SERVER.CHANNELS.LOG.Main, embed);
});

export const memberTimeoutEmbed = withErrorHandling(async (guild: Guild, user: GuildMember) => {
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
