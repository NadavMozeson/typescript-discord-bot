import { Guild, GuildMember, PartialGuildMember, Role } from 'discord.js';
import { memberBanEmbed, memberUnbanEmbed, memberTimeoutEmbed } from '../components/logsEmbed';
import { withErrorHandling } from '../utils/errorHandler';
import { config } from '../index';
import { client } from '../index';

type GuildBanEvent = {
  user: { bot: boolean; id: string; };
  guild: Guild;
};

export async function setupMemberEvents() {
  client.on(
    'guildMemberAdd',
    withErrorHandling(async (member: GuildMember) => {
      const role = member.guild.roles.cache.find(
        (role: Role) => role.id === config.SERVER.ROLES.Member.toString()
      );
      if (role) {
        await member.roles.add(role);
      } else {
        throw new Error('Failed to add member role to user ' + member.displayName);
      }
    }),
  );

  client.on(
    'guildBanAdd',
    withErrorHandling(async (event: GuildBanEvent) => {
      if (!event.user.bot) {
        await memberBanEmbed(event.guild, event.user);
      }
    }),
  );

  client.on(
    'guildBanRemove',
    withErrorHandling(async (event: GuildBanEvent) => {
      if (!event.user.bot) {
        await memberUnbanEmbed(event.guild, event.user);
      }
    }),
  );

  client.on(
    'guildMemberUpdate',
    withErrorHandling(async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
        if (newMember.communicationDisabledUntil) {
          await memberTimeoutEmbed(newMember.guild, newMember);
        }
      }
    }),
  );
}
