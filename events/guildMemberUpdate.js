// events/guildMemberUpdate.js
import { Events, EmbedBuilder } from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  console.log(`[DEBUG] Role update detected for: ${newMember.user.tag}`);

  // 1. Immunity Check
  const level = await getMemberLevel(newMember);
  if (level > 0) {
    console.log(`[DEBUG] Member ${newMember.user.tag} is Staff (Level ${level}). Skipping nickname sync.`);
    return;
  }

  try {
    // 2. Fetch Guild Config
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(newMember.guild.id).get();

    if (!doc.exists) {
      console.log(`[DEBUG] No guild config found for ${newMember.guild.id}. Run /setup.`);
      return;
    }

    const config = doc.data();
    const xboxId = config.xboxRoleId;
    const psId = config.psRoleId;
    const steamId = config.steamRoleId;
    const platformRoleIds = [xboxId, psId, steamId].filter(id => id);

    console.log(`[DEBUG] Mapped IDs in DB: Xbox(${xboxId}), PS(${psId}), Steam(${steamId})`);

    // 3. Compare Roles
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    console.log(`[DEBUG] Roles added in this update: ${addedRoles.map(r => r.name).join(', ') || 'None'}`);

    const linkedRoleFound = addedRoles.find(role => platformRoleIds.includes(role.id));

    if (!linkedRoleFound) {
      console.log(`[DEBUG] No "Linked Role" detected in the added roles.`);
      return;
    }

    console.log(`[DEBUG] Match found! Linked Role ID: ${linkedRoleFound.id} (${linkedRoleFound.name})`);

    // 4. Nickname Sync
    const playerDoc = await db.collection('pariah_players').doc(newMember.id).get();
    if (!playerDoc.exists) {
      console.log(`[DEBUG] No registration found in Firestore for UID: ${newMember.id}. They need to run /register.`);
      return;
    }

    const gamertag = playerDoc.data().gamertag;
    if (!gamertag) {
      console.log(`[DEBUG] Registration exists but no 'gamertag' field found for ${newMember.user.tag}.`);
      return;
    }

    console.log(`[DEBUG] Attempting nickname change: ${newMember.nickname || newMember.user.username} -> ${gamertag}`);

    try {
      await newMember.setNickname(gamertag);
      console.log(`[DEBUG] Nickname change SUCCESS.`);

      // Optional: Send confirmation DM
      const embed = new EmbedBuilder()
        .setTitle('Identity Verified')
        .setDescription(`✅ I've recognized your platform link, <@${newMember.id}>. Your server nickname has been updated to match your registered tag: \`${gamertag}\`.`)
        .setColor(0x00FF00);

      await newMember.send({ embeds: [embed] }).catch(() => console.log(`[DEBUG] Could not send DM (DMs closed).`));

    } catch (error) {
      console.error(`[DEBUG] Nickname change FAILED:`, error.message);
      if (error.message.includes('Missing Permissions')) {
        console.log(`[CRITICAL] I cannot change this user's name. Check the Role Hierarchy. My role must be HIGHER than theirs.`);
      }
    }

  } catch (err) {
    console.error('[DEBUG] Global Error in guildMemberUpdate:', err);
  }
}
