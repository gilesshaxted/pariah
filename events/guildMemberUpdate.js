// events/guildMemberUpdate.js
import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  // 1. Immunity Check: Moderators and Admins are untouched
  const level = await getMemberLevel(newMember);
  if (level > 0) return;

  // Role names to watch for (adjust these to match your server's linked role names)
  const platformRoles = ['Xbox', 'PlayStation', 'Steam'];
  
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const platformRoleAdded = addedRoles.find(role => platformRoles.includes(role.name));

  if (platformRoleAdded) {
    console.log(`[LINKED ROLES] ${newMember.user.tag} linked ${platformRoleAdded.name}`);

    // Find all platform roles they currently have
    const currentPlatforms = newMember.roles.cache
      .filter(role => platformRoles.includes(role.name))
      .map(role => role.name.toLowerCase().replace('playstation', 'ps'));

    try {
      // 2. Fetch tags from Firestore
      const playerDoc = await db.collection('pariah_players').doc(newMember.id).get();
      const playerData = playerDoc.exists ? playerDoc.data() : null;

      if (currentPlatforms.length === 1) {
        // Simple case: Just one platform, change nickname automatically
        const platform = currentPlatforms[0];
        const tag = playerData?.[`${platform}_tag`] || playerData?.gamertag;

        if (tag) {
          await newMember.setNickname(tag).catch(e => console.error("Nick change failed:", e));
          await newMember.send(`✅ Thank you for linking your **${platform.toUpperCase()}** account. I've updated your nickname to match your tag: \`${tag}\`. Welcome to the frequency.`);
        }
      } else if (currentPlatforms.length > 1) {
        // Complex case: Multiple platforms, ask for a "Main"
        const row = new ActionRowBuilder();
        
        currentPlatforms.forEach(p => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`main_acc_${p}`)
              .setLabel(p.toUpperCase())
              .setStyle(ButtonStyle.Primary)
          );
        });

        await newMember.send({
          content: `Thank you for linking multiple accounts, survivor. Which one is your **main** playing account for Deadside? I'll use it for your server nickname.`,
          components: [row]
        }).catch(() => null); // User might have DMs closed
      }
    } catch (err) {
      console.error('[LINKED ROLE SYNC ERROR]', err);
    }
  }
}
