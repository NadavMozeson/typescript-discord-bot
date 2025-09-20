import {
  CategoryChannel,
  ChannelType,
  CommandInteraction,
  PermissionsBitField,
  TextChannel,
  User,
} from "discord.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { dbManager } from "../utils/databaseManager.js";
import { client, config } from "../index.js";

export const handleOpenDMInteraction = withErrorHandling(
  async (interaction: CommandInteraction) => {
    const user = interaction.options.get("משתמש")?.user;
    if (user) {
      const action = interaction.options.get("פעולה")?.value;
      if (action === "open") {
        await createPrivateChat(user, false);
        await interaction.reply({
          content: `נפתח צאט פרטי עם המשתמש ${user}`,
          ephemeral: true,
        });
      } else if (action === "close") {
        await deletePrivateChat(user);
        await interaction.reply({
          content: `נסגר צאט פרטי עם המשתמש ${user}`,
          ephemeral: true,
        });
      }
    }
  }
);

export const createPrivateChat = withErrorHandling(
  async (user: User, isVIP: boolean) => {
    if (!(await dbManager.DM.checkIfChatExists(user.id))) {
      const guild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId);

      let categories = guild.channels.cache.filter(
        (category) =>
          category.name.startsWith("🔒 | צאטים פרטיים | 🔒") &&
          category.type === ChannelType.GuildCategory &&
          category.children.cache.size < 50
      );
      let category = null;
      if (categories.size === 0) {
        category = await guild.channels.create({
          name: "🔒 | צאטים פרטיים | 🔒",
          type: ChannelType.GuildCategory,
        });
      } else {
        category = categories.first();
      }
      if (category) {
        const dmChannel = await guild.channels.create({
          name: `${user.username} צאט פרטי`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
          ],
        });

        if (dmChannel) {
          const message =
            `שלום ${user},\n` +
            "תודה רבה על תמיכתך בערוץ וברוך הבא לקבוצת חברי המועדון שלנו!\n" +
            "בצאט זה אתה יכול לשלוח לנו הודעות בצורה פרטנית ולקבל מענה באופן אישי על כל שאלה או מחשבה.\n" +
            "בנוסף, זמינים לך החדרים במתחם החברי מועדון שלנו. מוזמן לטייל שם ולראות תוכן אשר זמין רק לכם!\n" +
            "שוב, ברוך הבא ותודה על תמיכתך❤️\n\n" +
            "מידע על איך להרוויח בפרימיום: https://discord.com/channels/1292451530787655730/1296580158777720863 \n" +
            "מידע על כלל ההטבות של חברי הפרימיום https://discord.com/channels/1292451530787655730/1293140415939346432";
          await dmChannel.send(message);
          await dbManager.DM.createNewChat(user.id, dmChannel.id, isVIP);
        }
      }
    }
  }
);

export const deletePrivateChat = withErrorHandling(async (user: User) => {
  if (await dbManager.DM.checkIfChatExists(user.id)) {
    const guild = await client.guilds.fetch(
      config.VIP_SERVER.INFO.ServerId.toString()
    );
    const channelId = await dbManager.DM.getChatChannel(user.id);
    if (channelId) {
      const allChannels = await guild.channels.fetch();
      if (allChannels.has(channelId.toString())) {
        const channel = allChannels.get(channelId.toString());
        if (channel instanceof TextChannel) {
          const category = channel.parent;
          await channel.delete();
          await dbManager.DM.deleteChat(channelId);
          if (category instanceof CategoryChannel) {
            if (category.children.cache.size === 0) {
              await category.delete();
            }
          }
        }
      }
    } else {
      await dbManager.DM.deleteChat(channelId);
    }
  }
});

export const syncVipRoomsOnStartup = withErrorHandling(async () => {
  const guild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId);
  // Pull a fresh member cache (important on cold start)
  const members = await guild.members.fetch();

  // Small concurrency limiter to be gentle on rate limits
  const limit = <T>(n: number, arr: T[], fn: (x: T) => Promise<any>) => {
    const q = [...arr];
    const workers = Array.from({ length: n }).map(async () => {
      while (q.length) {
        const item = q.shift()!;
        await fn(item);
      }
    });
    return Promise.all(workers);
  };

  const vipMembers = members.filter(
    (m) =>
      m.roles.cache.has(config.VIP_SERVER.ROLES.VIP) ||
      m.roles.cache.has(config.VIP_SERVER.ROLES.VIP2)
  );

  await limit(5, [...vipMembers.values()], async (m) => {
    const hasRow = await dbManager.DM.checkIfChatExists(m.id);
    if (!hasRow) {
      // No record: just create a VIP chat
      await createPrivateChat(m.user, true);
      return;
    }

    // Has DB row — validate the channel still exists
    const channelId = await dbManager.DM.getChatChannel(m.id);
    if (!channelId) {
      // orphaned DB row, recreate chat + heal row
      await createPrivateChat(m.user, true);
      return;
    }

    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch) {
      // channel deleted manually—recreate to keep guarantees
      await createPrivateChat(m.user, true);
    }
  });
});
