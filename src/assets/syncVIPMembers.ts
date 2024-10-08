import { Colors, CommandInteraction, DiscordAPIError, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { client, config } from "../index.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { wordpressDBManager } from "../utils/websiteDatabaseManage.js";

export const handleVIPRequestCommand = withErrorHandling(async (interaction: CommandInteraction) => {
    await interaction.reply({ content: "⌛ בודק נתונים, אנא המתן... ⌛", ephemeral: true });
    const userID = interaction.user.id
    if (await wordpressDBManager.isUserVIP(userID)) {
        const guild = interaction.guild
        let roleID = config.SERVER.ROLES.VIP
        if (guild) {
            if (guild.id === config.VIP_SERVER.INFO.ServerId) {
                roleID = config.VIP_SERVER.ROLES.VIP
            }
            const premiumRole = await guild.roles.fetch(roleID)
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
        const mainGuild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
        const mainPremiumRole = await mainGuild.roles.fetch(config.SERVER.ROLES.VIP)
        const vipGuild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId)
        const vipPremiumRole = await vipGuild.roles.fetch(config.VIP_SERVER.ROLES.VIP)
        if (mainGuild && mainPremiumRole && vipGuild && vipPremiumRole) {
            for (const id of vipList) {
                try {
                    const member = await mainGuild.members.fetch(id)
                    if (member && !member.roles.cache.has(mainPremiumRole.id)) {
                        await member.roles.add(mainPremiumRole);
                    }
                    const vipMember = await vipGuild.members.fetch(id)
                    if (vipMember && !vipMember.roles.cache.has(vipPremiumRole.id)) {
                        await vipMember.roles.add(vipPremiumRole);
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
    const mainGuild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
    const mainPremiumRole = await mainGuild.roles.fetch(config.SERVER.ROLES.VIP)
    const vipGuild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId)
    const vipPremiumRole = await vipGuild.roles.fetch(config.VIP_SERVER.ROLES.VIP)
    if (mainGuild && mainPremiumRole && vipPremiumRole && vipGuild && vipList) {
        await mainGuild.members.fetch();
        const mainMembers = mainPremiumRole.members
        mainMembers.forEach(async (member) => {
            if (vipList.indexOf(member.id) === -1) {
                await member.roles.remove(mainPremiumRole)
            }
        })
        await vipGuild.members.fetch();
        const vipMembers = vipPremiumRole.members
        vipMembers.forEach(async (member) => {
            if (vipList.indexOf(member.id) === -1) {
                await member.roles.remove(vipPremiumRole)
            }
        })
    }
})

export const updateUserForVIP = withErrorHandling(async (userID) => {
    if (await wordpressDBManager.isUserVIP(userID)) {
        const mainGuild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
        const mainPremiumRole = await mainGuild.roles.fetch(config.SERVER.ROLES.VIP)
        if (mainPremiumRole) {
            try {
                const member = await mainGuild.members.fetch(userID)
                if (member && !member.roles.cache.has(mainPremiumRole.id)) {
                    await member.roles.add(mainPremiumRole);
                }
            } catch (error) {
                if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                    throw error
                }
            }
        }
        const vipGuild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId)
        const vipPremiumRole = await vipGuild.roles.fetch(config.VIP_SERVER.ROLES.VIP)
        if (vipPremiumRole) {
            try {
                const member = await vipGuild.members.fetch(userID)
                if (member && !member.roles.cache.has(vipPremiumRole.id)) {
                    await member.roles.add(vipPremiumRole);
                }
            } catch (error) {
                if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                    throw error
                }
            }
        }
    }
})

export const newUserJoinVIPServer = withErrorHandling(async (member: GuildMember) => {
    const isVIP = await wordpressDBManager.isUserVIP(member.user.id)
    const vipGuild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId)
    if (isVIP) {
        const vipPremiumRole = await vipGuild.roles.fetch(config.VIP_SERVER.ROLES.VIP)
        if (vipPremiumRole) {
            try {
                if (member && !member.roles.cache.has(vipPremiumRole.id)) {
                    await member.roles.add(vipPremiumRole);
                }
            } catch (error) {
                if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                    throw error
                }
            }
        }
    }
    const welcomeChannel = await client.channels.fetch(config.VIP_SERVER.CHANNELS.Welcome)
    const avatar = member.avatarURL()
    if (welcomeChannel instanceof TextChannel) {
        const embed = new EmbedBuilder()
            .setColor(isVIP ? Colors.Green : Colors.Red)
            .addFields(
                { name: 'משתמש', value: `${member}` },
                { name: 'רכש פרימיום', value: isVIP ? "✅" : "❌" }
            )
            .setAuthor({ name: `${vipGuild.name}`, iconURL: `${vipGuild.iconURL()}` });
        if (avatar !== null) {
            embed.setThumbnail(avatar);
        }
        await welcomeChannel.send({ embeds: [embed] });
    }
})