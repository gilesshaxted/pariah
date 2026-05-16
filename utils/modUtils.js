// utils/modUtils.js
import { db } from './firebase.js';
import { EmbedBuilder } from 'discord.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Logs a moderation action to Firestore and the guild's log channel.
 */
export async function logAction(client, { guild, target, moderator, type, reason, duration = null }) {
  const guildRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('guild_configs').doc(guild.id);
  const logCollection = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('modlogs');

  try {
    // 1. Get/Increment Case Number
    const guildDoc = await guildRef.get();
    let caseNumber = 1;
    if (guildDoc.exists && guildDoc.data().caseCounter) {
      caseNumber = guildDoc.data().caseCounter + 1;
    }
    await guildRef.set({ caseCounter: caseNumber }, { merge: true });

    // 2. Save to Firestore
    const logData = {
      guildId: guild.id,
      caseId: caseNumber,
      targetId: target.id,
      targetTag: target.tag || target.user?.tag,
      moderatorId: moderator.id,
      type: type.toUpperCase(),
      reason: reason || 'No reason provided',
      duration: duration,
      timestamp: new Date()
    };
    await logCollection.add(logData);

    // 3. Post to Log Channel if configured
    if (guildDoc.exists && guildDoc.data().logChannelId) {
      const channel = await guild.channels.fetch(guildDoc.data().logChannelId).catch(() => null);
      if (channel) {
        const colorMap = { WARN: 0xFFCC00, TIMEOUT: 0xFFA500, KICK: 0xFF4500, BAN: 0xCC0000, UNBAN: 0x00FF00 };
        const embed = new EmbedBuilder()
          .setTitle(`Case #${caseNumber} | ${type}`)
          .setThumbnail(target.displayAvatarURL?.() || null)
          .addFields(
            { name: 'Member', value: `<@${target.id}> (${target.id})`, inline: true },
            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided' }
          )
          .setColor(colorMap[type] || 0x000000)
          .setTimestamp();
        
        if (duration) embed.addFields({ name: 'Duration', value: duration, inline: true });

        await channel.send({ embeds: [embed] });
      }
    }

    return caseNumber;
  } catch (error) {
    console.error('[MOD UTILS ERROR]', error);
    return null;
  }
}
