import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, CommandInteraction, DiscordAPIError, EmbedBuilder, GuildMember, NewsChannel, TextChannel } from "discord.js";
import { client, config } from "../index.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { wordpressDBManager } from "../utils/websiteDatabaseManage.js";

export const handleVIPRequestCommand = withErrorHandling(async (interaction: CommandInteraction | ButtonInteraction) => {
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
                        await interaction.editReply({ content: "✅ קיבלת את כלל הגישות! מוזמן ללכת לצאט https://discord.com/channels/919996404368306227/1293237648915435715 על מנת להיכנס למתחם הפרימיום ✅" });
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

export const updateUserForVIP = withErrorHandling(async (interaction: CommandInteraction) => {
    const userID = interaction.options.get('משתמש')?.user?.id
    
    if (userID && await wordpressDBManager.isUserVIP(userID)) {
        if (interaction.guildId === config.SERVER.INFO.ServerId) {
            const mainGuild = await client.guilds.fetch(config.SERVER.INFO.ServerId)
            const mainPremiumRole = await mainGuild.roles.fetch(config.SERVER.ROLES.VIP)
            if (mainPremiumRole) {
                try {
                    const member = await mainGuild.members.fetch(userID)
                    if (member && !member.roles.cache.has(mainPremiumRole.id)) {
                        await member.roles.add(mainPremiumRole);
                        await interaction.reply({ content: 'המשתמש קיבל את הגישות המתאימות ✅', ephemeral: true })
                    } else {
                        await interaction.reply({ content: 'למשתמש יש כבר את הגישות המתאימות ⚠️', ephemeral: true })
                    }
                } catch (error) {
                    if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                        throw error
                    }
                }
            }
        } else {
            const vipGuild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId)
            const vipPremiumRole = await vipGuild.roles.fetch(config.VIP_SERVER.ROLES.VIP)
            if (vipPremiumRole) {
                try {
                    const member = await vipGuild.members.fetch(userID)
                    if (member && !member.roles.cache.has(vipPremiumRole.id)) {
                        await member.roles.add(vipPremiumRole);
                        await interaction.reply({ content: 'המשתמש קיבל את הגישות המתאימות ✅', ephemeral: true })
                    } else {
                        await interaction.reply({ content: 'למשתמש יש כבר את הגישות המתאימות ⚠️', ephemeral: true })
                    }
                } catch (error) {
                    if (!(error instanceof DiscordAPIError && error.code === 10007)) {
                        throw error
                    }
                }
            }
        }
    } else {
        await interaction.reply({ content: 'המשתמש לא רכש מנוי פרימיום ❌', ephemeral: true })
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

export const vipHelpMessage = withErrorHandling(async () => {
    const channel = await client.channels.fetch(config.SERVER.CHANNELS.SyncGuide.toString())
    const text = `
# איך לקבל גישות למתחם הפרימיום לאחר רכישה באתר שלנו 🏅
קישור לרכישת מנוי: https://oziman.shop

## מעבר לעמוד "אזור אישי"
לאחר רכישת המנוי שלכם. עברו לעמוד "אזור אישי" שם תוכלו לראות את המידע האישי שלכם.

## ערוך פרופיל
יש ללחוץ על "ערוך פרופיל", מופיע בתחתית האזור "החשבון שלי"

## קישור דיסקורד
יש ללחוץ על הכפתור הירוק "קישור דיסקורד", אם הדיסקורד שלכם מקושר יופיע כפתור אדום של ביטול קישור.

## אישור גישות
יש ללחוץ על כפתור האישור אשר יופיע בתחתית העמוד החדש שנפתח לכם.

## המתנה
יש להמתין עד שעה לקבלת הגישות.
ניתן ללחוץ על הכפתור למטה על מנת לדלג על שלב ההמתנה 👇

## וזהו
חיברתם בהצלחה את החשבון באתר שלנו לחשבון הדיסקורד שלכם.
עכשיו אתם יכולים לראות את כל ההרשאות אשר מגיעות לכם.

*מדריך זה פונה לחברי שרת אשר נרשמו בתור חברי הפרימיום באתר הרשמי שלנו*
*לעזרה ניתן לפתוח טיקט*

תודה רבה על תמיכתם ❤️

**[||@everyone||]**
`

    const regularButton = new ButtonBuilder()
        .setCustomId('sync-user-vip-button')
        .setLabel('דילוג על שלב ההמתנה')
        .setEmoji('⌛')
        .setStyle(ButtonStyle.Secondary)

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(regularButton);
        
    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
        await channel.messages.fetch()
        if (channel.lastMessage === null){
            await channel.send({ content: text, components: [buttonsRow] });
        } 
	} else {
		console.warn(`Channel with ID ${config.SERVER.CHANNELS.Ticket} is not a text or news channel.`);
	}
})