// events/messageReactionAdd.js
import { Events, PermissionFlagsBits } from 'discord.js';
import { logAction, canModerate } from '../utils/modUtils.js';

export const name = Events.MessageReactionAdd;

export async function execute(reaction, user, client) {
  // 1. Partial Handling (Very Important)
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Could not fetch reaction:', error);
      return;
    }
  }

  const { message } = reaction;
  if (!message.guild || user.bot) return;

  // 2. Authority Check
  const moderatorMember = await message.guild.members.fetch(user.id);
  const targetMember = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);

  if (!targetMember || targetMember.user.bot) return;

  // 3. Hierarchy Check
  const authorized = await canModerate(moderatorMember, targetMember);
  
  // If not authorized AND not the guild owner, ignore
  if (!authorized && user.id !== message.guild.ownerId) {
    return await reaction.users.remove(user.id).catch(() => null);
  }

  const emoji = reaction.emoji.name;
  let actionType = null;
  let reason = `Emoji Moderation (${emoji}) by ${user.tag}`;

  try {
    if (emoji === '⚠️') {
      actionType = 'WARN';
      await message.delete();
    } 
    else if (emoji === '🔇') {
      actionType = 'TIMEOUT';
      await targetMember.timeout(3600000, reason); // 1 hour
      await message.delete();
    } 
    else if (emoji === '👢') {
      actionType = 'KICK';
      await targetMember.kick(reason);
      await message.delete();
    }

    if (actionType) {
      await logAction(client, {
        guild: message.guild,
        target: targetMember.user,
        moderator: user,
        type: actionType,
        reason: reason
      });
      console.log(`[EMOJI MOD] ${actionType} applied to ${targetMember.user.tag}`);
    }
  } catch (err) {
    console.error('[EMOJI MOD ERROR]', err);
  }
}
