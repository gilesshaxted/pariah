// utils/modUtils.js
import { db } from './firebase.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Calculates a member's hierarchy level.
 */
export async function getMemberLevel(member) {
  if (member.id === member.guild.ownerId) return 3; // Owner
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return 2; // Admin

  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(member.guild.id).get();

    if (doc.exists) {
      const config = doc.data();
      const modRoleIds = config.modRoleIds || [];
      if (member.roles.cache.some(role => modRoleIds.includes(role.id))) return 1; // Moderator
    }
  } catch (e) {
    console.error('[LEVEL CHECK ERROR]', e);
  }

  return 0; // Regular User
}

/**
 * Checks if a moderator has the authority to act on a target.
 */
export async function canModerate(moderator, target) {
  if (moderator.id === moderator.guild.ownerId) return true; // Owner is God
  if (target.id === target.guild.ownerId) return false; // Nobody touches Owner

  const modLevel = await getMemberLevel(moderator);
  const targetLevel = await getMemberLevel(target);

  // You can only moderate those BELOW you. (Admin > Mod, Mod > User)
  return modLevel > targetLevel;
}

/**
 * Logs a moderation action
 */
export async function logAction(client, { guild, target, moderator, type, reason, duration = null }) {
  const guildRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('guild_configs').doc(guild.id);
  const logCollection = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('modlogs');

  try {
    const guildDoc = await guildRef.get();
    const config = guildDoc.exists ? guildDoc.data() : {};
    
    let caseNumber = config.caseCounter || 0;
    caseNumber++;
    await guildRef.set({ caseCounter: caseNumber }, { merge: true });

    await logCollection.add({
      guildId: guild.id,
      caseId: caseNumber,
      targetId: target.id,
      targetTag: target.tag || target.user?.tag,
      moderatorId: moderator.id,
      type: type.toUpperCase(),
      reason: reason || 'No reason provided',
      duration: duration,
      timestamp: new Date()
    });

    if (config.logChannelId) {
      const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
      if (channel) {
        const colorMap = { WARN: 0xFFCC00, TIMEOUT: 0xFFA500, KICK: 0xFF4500, BAN: 0xCC0000 };
        const embed = new EmbedBuilder()
          .setTitle(`Case #${caseNumber} | ${type}`)
          .addFields(
            { name: 'Member', value: `<@${target.id}>`, inline: true },
            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided' }
          )
          .setColor(colorMap[type] || 0x000000)
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });
      }
    }
    return caseNumber;
  } catch (error) {
    console.error('[MOD UTILS ERROR]', error);
    return null;
  }
}
