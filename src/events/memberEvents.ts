import { Guild, GuildMember, PartialGuildMember, Role } from 'discord.js';
import { memberBanEmbed, memberUnbanEmbed, memberTimeoutEmbed, newVIPMember } from '../components/logsEmbed.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { config, client } from '../index.js';
import { createPrivateChat, deletePrivateChat } from '../assets/privateChats.js';
import { newUserJoinVIPServer } from '../assets/syncVIPMembers.js';

type GuildBanEvent = {
  user: { bot: boolean; id: string; };
  guild: Guild;
};

export async function setupMemberEvents() {
  client.on(
    'guildMemberAdd',
    withErrorHandling(async (member: GuildMember) => {
      if (member.guild.id === config.SERVER.INFO.ServerId){
        const role = member.guild.roles.cache.find(
          (role: Role) => role.id === config.SERVER.ROLES.Member.toString()
        );
        if (role) {
          await member.roles.add(role);
        } else {
          throw new Error('Failed to add member role to user ' + member.displayName);
        }
      } else {
        await newUserJoinVIPServer(member)
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
      await checkIfTimeout(oldMember, newMember)
      await checkForVIPUpdate(oldMember, newMember)
    }),
  );
}

const checkIfTimeout = withErrorHandling(async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
  if (oldMember.isCommunicationDisabled() || newMember.isCommunicationDisabled()){
    if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
      if (newMember.communicationDisabledUntil) {
        await memberTimeoutEmbed(newMember.guild, newMember);
      }
    }
  }
})

const checkForVIPUpdate = withErrorHandling(async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
  const role = await oldMember.guild.roles.fetch(config.VIP_SERVER.ROLES.VIP.toString())
  if (role) {
    if (!oldMember.roles.cache.has(role.id) && newMember.roles.cache.has(role.id)) {
      await createPrivateChat(newMember.user, true)
      await newVIPMember(newMember)
    } else if (oldMember.roles.cache.has(role.id) && !newMember.roles.cache.has(role.id)) {
      await deletePrivateChat(newMember.user)
    }
  }
})