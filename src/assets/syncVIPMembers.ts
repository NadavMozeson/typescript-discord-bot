import { CommandInteraction, DiscordAPIError, User } from "discord.js";
import { client, config } from "../index.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { wordpressDBManager } from "../utils/websiteDatabaseManage.js";

export const handleVIPRequestCommand = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ content: "⌛ בודק נתונים, אנא המתן... ⌛", ephemeral: true });
    const userID = interaction.user.id
    if (await wordpressDBManager.isUserVIP(userID)) {
        const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
        const premiumRole = await guild.roles.fetch(config.SERVER.ROLES.VIP)
        if (premiumRole) {
            const member = await guild.members.fetch(userID)
            if (member) {
                await member.roles.add(premiumRole);
                if (member.roles.cache.has(premiumRole.id)) {
                    await interaction.editReply({ content: "✅ קיבלת את כלל הגישות בהצלחה! מוזמן ללכת ל https://discord.com/channels/919996404368306227/1287059823258763346 בשביל לראות הסבר על כל ההטבות והחדרים ✅" });
                } else {
                    await interaction.editReply({ content: "❌ קרתה שגיאה, אנחנו רואים שרכשת מנוי וקישרת את החשבון. אנא נסה שוב מאוחר יותר או פנה אליינו בטיקט ❌" });
                }
            }
        }
    } else {
        await interaction.editReply({ content: "❌ יש לרכוש מנוי באתר שלנו ולאחר מכן לקשר את החשבון דיסקורד לחשבון באתר (https://discord.com/channels/919996404368306227/1271487467727360022) על מנת לקבל גישות ❌" });
    }
})

export const syncAllVIPs = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ content: "⌛ מבצע סנכרון חברי פרימיום, אנא המתן... ⌛", ephemeral: true });
    await checkToAddRole()
    await checkToRemoveRole()
    await interaction.editReply({ content: "✅ סיים ביצוע סנכרון חברי פרימיום ✅" });
})

export const handleVIPSync = withErrorHandling(async () => {
    await checkToAddRole()
    await checkToRemoveRole()
    setInterval(async () => {
        await checkToAddRole()
        await checkToRemoveRole()
    }, 60 * 60 * 1000);
})

const checkToAddRole = withErrorHandling(async () => {
    const vipList = await wordpressDBManager.getAllVIPs()
    if (vipList) {
        const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
        const premiumRole = await guild.roles.fetch(config.SERVER.ROLES.VIP)
        if (guild && premiumRole) {
            for (const id of vipList) {
                try {
                    const member = await guild.members.fetch(id)
                    if (member && !member.roles.cache.has(premiumRole.id)) {
                        await member.roles.add(premiumRole);
                    }
                } catch (error) {
                    if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                        throw error
                    }
                }
            }
        }
    } else {
        throw new Error('Error fetching VIP list in checkToAddRole')
    }
})

const checkToRemoveRole = withErrorHandling(async () => {
    const vipList = await wordpressDBManager.getAllVIPs()
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
    const premiumRole = await guild.roles.fetch(config.SERVER.ROLES.VIP)
    if (guild && premiumRole && vipList) {
        await guild.members.fetch();
        const members = premiumRole.members
        members.forEach(async (member) => {
            if (vipList.indexOf(member.id) === -1) {
                await member.roles.remove(premiumRole)
            }
        })
    }
})