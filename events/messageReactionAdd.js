// events/messageReactionAdd.js
import { Events, PermissionFlagsBits } from 'discord.js';
import { logAction, canModerate } from '../utils/modUtils.js';

export const name = Events.MessageReactionAdd;

export async function execute(reaction, user, client) {
  // 1. Partial Handling (Crucial for older messages)
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

  // 2. Authority Check: Fetch the moderator and the target
  const moderatorMember = await message.guild.members.fetch(user.id);
  const targetMember = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);

  if (!targetMember || targetMember.user.bot) return;

  // 3. Hierarchy Check: Moderators can't touch peers or superiors
  const authorized = await canModerate(moderatorMember, targetMember);
  
  // If not authorized AND not the guild owner, remove the reaction and stop
  if (!authorized && user.id !== message.guild.ownerId) {
    return await reaction.users.remove(user.id).catch(() => null);
  }

  const emoji = reaction.emoji.name;
  let actionType = null;
  let reason = `Emoji Moderation (${emoji}) by ${user.tag}`;
  
  // --- CAPTURE EVIDENCE ---
  const content = message.content || "*No text content*";
  const attachmentUrls = message.attachments.map(a => a.url).join('\n');
  const evidence = `${content}${attachmentUrls ? `\n\n**Attachments:**\n${attachmentUrls}` : ''}`;

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
    else if (emoji === '🔨') {
      actionType = 'BAN';
      await interaction.guild.members.ban(targetMember.user, { reason });
      await message.delete();
    }
    else if (emoji === '🔗') {
      actionType = 'FLAG';
      // No punishment action taken, just logging the details for mod review
      // We don't delete the message for a flag unless you want to, darling.
    }

    if (actionType) {
      await logAction(client, {
        guild: message.guild,
        target: targetMember.user,
        moderator: user,
        type: actionType,
        reason: reason,
        evidence: evidence
      });
      console.log(`[EMOJI MOD] ${actionType} logged for ${targetMember.user.tag}`);
    }
  } catch (err) {
    console.error('[EMOJI MOD ERROR]', err);
  }
}
