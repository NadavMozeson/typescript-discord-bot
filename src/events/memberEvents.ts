import { Guild, GuildMember, PartialGuildMember, Role } from "discord.js";
import {
  memberBanEmbed,
  memberUnbanEmbed,
  memberTimeoutEmbed,
  newVIPMember,
} from "../components/logsEmbed.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import { config, client } from "../index.js";
import {
  createPrivateChat,
  deletePrivateChat,
} from "../assets/privateChats.js";

type GuildBanEvent = {
  user: { bot: boolean; id: string };
  guild: Guild;
};

export async function setupMemberEvents() {
  client.on(
    "guildMemberAdd",
    withErrorHandling(async (member: GuildMember) => {
      if (member.guild.id === config.SERVER.INFO.ServerId) {
        const role = member.guild.roles.cache.find(
          (role: Role) => role.id === config.SERVER.ROLES.Member.toString()
        );
        if (role) {
          await member.roles.add(role);
        } else {
          throw new Error(
            "Failed to add member role to user " + member.displayName
          );
        }
      }
    })
  );

  client.on(
    "guildBanAdd",
    withErrorHandling(async (event: GuildBanEvent) => {
      if (!event.user.bot) {
        await memberBanEmbed(event.guild, event.user);
      }
    })
  );

  client.on(
    "guildBanRemove",
    withErrorHandling(async (event: GuildBanEvent) => {
      if (!event.user.bot) {
        await memberUnbanEmbed(event.guild, event.user);
      }
    })
  );

  client.on(
    "guildMemberUpdate",
    withErrorHandling(
      async (
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember
      ) => {
        await checkIfTimeout(oldMember, newMember);
      }
    )
  );

  client.on(
    "guildMemberUpdate",
    withErrorHandling(
      async (
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember
      ) => {
        // keep your existing timeout check
        await checkIfTimeout(oldMember, newMember);

        // handle VIP role add/remove => open/close private room
        await checkVipRoleChange(oldMember, newMember);
      }
    )
  );
}

const checkIfTimeout = withErrorHandling(
  async (
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ) => {
    if (
      oldMember.isCommunicationDisabled() ||
      newMember.isCommunicationDisabled()
    ) {
      if (
        oldMember.communicationDisabledUntil !==
        newMember.communicationDisabledUntil
      ) {
        if (newMember.communicationDisabledUntil) {
          await memberTimeoutEmbed(newMember.guild, newMember);
        }
      }
    }
  }
);

const checkVipRoleChange = withErrorHandling(
  async (
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ) => {
    // Only act in the VIP server
    if (newMember.guild.id !== config.VIP_SERVER.INFO.ServerId) return;

    // Safely read role presence on old/new (old can be PartialGuildMember)
    const oldHasVIP = !!(oldMember as GuildMember).roles?.cache?.has(
      config.VIP_SERVER.ROLES.VIP
    );
    const newHasVIP = newMember.roles.cache.has(config.VIP_SERVER.ROLES.VIP);

    const oldHasVIP2 = !!(oldMember as GuildMember).roles?.cache?.has(
      config.VIP_SERVER.ROLES.VIP2
    );
    const newHasVIP2 = newMember.roles.cache.has(config.VIP_SERVER.ROLES.VIP2);

    // VIP granted -> open (or ensure) private chat
    if ((!oldHasVIP && newHasVIP) || (!oldHasVIP2 && newHasVIP2)) {
      await createPrivateChat(newMember.user, true);
      return;
    }

    // VIP removed -> close private chat
    if ((oldHasVIP && !newHasVIP) || (oldHasVIP2 && !newHasVIP2)) {
      await deletePrivateChat(newMember.user);
      return;
    }
  }
);
