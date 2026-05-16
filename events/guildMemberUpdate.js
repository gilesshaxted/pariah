// events/guildMemberUpdate.js
import { Events, EmbedBuilder } from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  // Only log if the roles actually changed to keep the console clean
  if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

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

    // 3. Compare Roles
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const linkedRoleFound = addedRoles.find(role => platformRoleIds.includes(role.id));

    if (!linkedRoleFound) {
      // If we didn't find a NEW platform role, we don't need to do anything
      return;
    }

    console.log(`[DEBUG] Match found! Linked Role: ${linkedRoleFound.name}`);

    // 4. Nickname Sync - We search the collection for the discordId
    const playersSnapshot = await db.collection('pariah_players').get();
    const playerDoc = playersSnapshot.docs.find(d => d.data().discordId === newMember.id);

    if (!playerDoc) {
      console.log(`[DEBUG] No registration found for Discord ID: ${newMember.id}. They need to run /register.`);
      return;
    }

    const playerData = playerDoc.data();
    const gamertag = playerData.gamertag;

    if (!gamertag) {
      console.log(`[DEBUG] Registration exists but no 'gamertag' field found for ${newMember.user.tag}.`);
      return;
    }

    // Only attempt change if the nickname isn't already correct
    if (newMember.nickname === gamertag) {
      console.log(`[DEBUG] Nickname is already correct. Skipping.`);
      return;
    }

    console.log(`[DEBUG] Attempting nickname change: ${newMember.nickname || newMember.user.username} -> ${gamertag}`);

    try {
      await newMember.setNickname(gamertag);
      console.log(`[DEBUG] Nickname change SUCCESS.`);

      const embed = new EmbedBuilder()
        .setTitle('Identity Verified')
        .setDescription(`✅ I've recognized your platform link, <@${newMember.id}>. Your server nickname has been updated to match your registered tag: \`${gamertag}\`.`)
        .setColor(0x00FF00);

      await newMember.send({ embeds: [embed] }).catch(() => console.log(`[DEBUG] Could not send DM (DMs closed).`));

    } catch (error) {
      console.error(`[DEBUG] Nickname change FAILED:`, error.message);
      if (error.message.includes('Missing Permissions')) {
        console.log(`[CRITICAL] I cannot change this user's name. Check the Role Hierarchy. My role (The Pariah) must be ABOVE the ${linkedRoleFound.name} role in Server Settings.`);
      }
    }

  } catch (err) {
    console.error('[DEBUG] Global Error in guildMemberUpdate:', err);
  }
}
