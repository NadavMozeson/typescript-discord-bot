import { withErrorHandling } from "../utils/errorHandler.js";
import { client, config } from "../index.js"
import axios from 'axios';
import { Guild, VoiceChannel } from "discord.js";

export const updateStats = withErrorHandling(async () => {
    await updateDiscordStats()
    await updateYouTubeStats()
    setInterval(async () => {
        await updateYouTubeStats()
        await updateDiscordStats()
    }, 3 * 60 * 60 * 1000); 
})

const updateYouTubeStats = withErrorHandling(async () => {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
        params: {
          part: 'statistics',
          id: process.env.YOUTUBE_CHANNEL_ID,
          key: process.env.YOUTUBE_API_KEY,
        },
      });
    const subCount = parseInt(response.data.items[0].statistics.subscriberCount, 10)
    const subsInK = Math.floor(subCount / 1000);
    const remainder = Math.floor((subCount % 1000) / 100);
    const subCountStr = `${subsInK}.${remainder}K : סאבים ביוטיוב`;
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.STATS.StatsYouTube.toString())
    if(channel && channel instanceof VoiceChannel){
        await channel.setName(subCountStr)
    }
})

const updateDiscordStats = withErrorHandling(async () => {
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString())
    if (guild instanceof Guild) {
        const memberCount = guild.memberCount
        const subsInK = Math.floor(memberCount / 1000);
        const remainder = Math.floor((memberCount % 1000) / 100);
        const countStr = `${subsInK}.${remainder}K : משתמשים בשרת`;
        client.user?.setActivity(countStr)
        const channel = await client.channels.fetch(config.SERVER.CHANNELS.STATS.StatsDiscord.toString())
        if(channel && channel instanceof VoiceChannel){
            await channel.setName(countStr)
        }
    }
})



