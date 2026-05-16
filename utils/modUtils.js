// utils/modUtils.js
import { db } from './firebase.js';
import { EmbedBuilder } from 'discord.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Logs a moderation action and checks permissions against stored roles.
 */
export async function logAction(client, { guild, target, moderator, type, reason, duration = null }) {
  const guildRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('guild_configs').doc(guild.id);
  const logCollection = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('modlogs');

  try {
    const guildDoc = await guildRef.get();
    const config = guildDoc.exists ? guildDoc.data() : {};
    
    // 1. Increment Case Number
    let caseNumber = config.caseCounter || 0;
    caseNumber++;
    await guildRef.set({ caseCounter: caseNumber }, { merge: true });

    // 2. Save Log
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

    // 3. Post to Log Channel
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
