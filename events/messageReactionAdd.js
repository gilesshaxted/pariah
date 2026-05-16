// events/messageReactionAdd.js
import { Events, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction } from '../utils/modUtils.js';

export const name = Events.MessageReactionAdd;

export async function execute(reaction, user, client) {
  // Partial check
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message:', error);
      return;
    }
  }

  const { message } = reaction;
  if (!message.guild || user.bot) return;

  const member = await message.guild.members.fetch(user.id);
  // Only moderators can use emoji-mod
  if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return;

  const targetMember = message.member;
  if (!targetMember || targetMember.user.bot) return;

  const emoji = reaction.emoji.name;
  let actionType = null;
  let reason = `Emoji Moderation (${emoji}) by ${user.tag}`;

  try {
    if (emoji === '⚠️') {
      actionType = 'WARN';
      await message.delete();
      await user.send(`Warned ${targetMember.user.tag} and deleted message.`);
    } 
    else if (emoji === '🔇') {
      actionType = 'TIMEOUT';
      await targetMember.timeout(3600000, reason); // 1 hour
      await message.delete();
      await user.send(`Timed out ${targetMember.user.tag} for 1 hour.`);
    } 
    else if (emoji === '👢') {
      actionType = 'KICK';
      // Delete recent messages (last 100 in channel as proxy for 2 weeks)
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(m => m.author.id === targetMember.id);
      await message.channel.bulkDelete(userMessages);
      await targetMember.kick(reason);
      await user.send(`Kicked ${targetMember.user.tag} and cleaned up recent messages.`);
    } 
    else if (emoji === '🚩') {
      actionType = 'FLAG';
      await message.delete();
      // Logic for mod-alert channel could go here
      await user.send(`Flagged and removed message from ${targetMember.user.tag}.`);
    }

    if (actionType) {
      await logAction({
        guildId: message.guild.id,
        targetId: targetMember.id,
        moderatorId: user.id,
        type: actionType,
        reason: reason,
        messageContent: message.content
      });
    }
  } catch (err) {
    console.error('Emoji Mod Failed:', err);
  }
}
