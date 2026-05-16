// events/guildMemberUpdate.js
import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  // 1. Immunity Check
  const level = await getMemberLevel(newMember);
  if (level > 0) return;

  try {
    // 2. Fetch Guild Config to see which roles are mapped
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(newMember.guild.id).get();

    if (!doc.exists) return;
    const config = doc.data();

    // The IDs of the roles we are watching
    const xboxId = config.xboxRoleId;
    const psId = config.psRoleId;
    const steamId = config.steamRoleId;
    const platformRoleIds = [xboxId, psId, steamId].filter(id => id);

    // Check if any of the ADDED roles match our mapped platform roles
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const linkedRoleFound = addedRoles.find(role => platformRoleIds.includes(role.id));

    if (linkedRoleFound) {
      console.log(`[LINKED ROLES] ${newMember.user.tag} verified a platform account.`);

      // 3. Logic to determine which platform was just added
      let platformLabel = "Unknown";
      if (linkedRoleFound.id === xboxId) platformLabel = "Xbox";
      if (linkedRoleFound.id === psId) platformLabel = "PlayStation";
      if (linkedRoleFound.id === steamId) platformLabel = "Steam";

      // 4. Nickname Synchronization
      const playerDoc = await db.collection('pariah_players').doc(newMember.id).get();
      if (playerDoc.exists) {
        const gamertag = playerDoc.data().gamertag;
        if (gamertag) {
          await newMember.setNickname(gamertag).catch(e => console.log("Nickname failed (Hierarchy):", e.message));
          
          const embed = new EmbedBuilder()
            .setTitle('Identity Verified')
            .setDescription(`✅ I've recognized your **${platformLabel}** link, <@${newMember.id}>. Your server nickname has been updated to match your registered tag: \`${gamertag}\`.`)
            .setColor(0x00FF00);

          await newMember.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error('[GUILD MEMBER UPDATE ERROR]', err);
  }
}
