import { TextChannel, NewsChannel, GuildMember, User, Channel } from "discord.js";
import { config } from "../index"
import { withErrorHandling } from "./errorHandler";

export const isUserOwner = async (user: User | GuildMember): Promise<Boolean> => {
    if (config.SERVER.INFO.Owners.includes(user.id)) {
        return true;
    }
    return false;
};

export const sendMessage = withErrorHandling(async (message: String, channel: Channel | null): Promise<void> => {
    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
        await channel.send(message.toString());
    } else {
        console.warn(`Channel with ID ${channel?.id} is not a text or news channel.`);
    }
});