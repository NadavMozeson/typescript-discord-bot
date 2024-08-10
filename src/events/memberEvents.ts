import { Guild, GuildMember, Role } from 'discord.js';
import { memberBanEmbed, memberUnbanEmbed, memberTimeoutEmbed } from '../components/embedsBuilder';
import { withErrorHandling } from '../utils/errorHandler';
import { config } from '../index';
import { client } from '../index';

// TypeScript definitions for the event handlers
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
    withErrorHandling(async (oldMember: GuildMember, newMember: GuildMember) => {
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
        if (newMember.communicationDisabledUntil) {
          await memberTimeoutEmbed(newMember.guild, newMember);
        }
      }
    }),
  );
}
