// commands/economy/hunt.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getEcoConfig, updateBalance, checkCooldown, setCooldown, getInventory } from '../../utils/economyUtils.js';

export const data = new SlashCommandBuilder()
  .setName('hunt')
  .setDescription('Go hunting for wild animals to earn currency');

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const config = await getEcoConfig(guildId);
  
  // Cooldown: 15 minutes
  const cd = await checkCooldown(guildId, userId, 'hunt');
  if (!cd.ready && (Date.now() - cd.lastUsed.getTime()) < 900000) {
    const mins = Math.ceil((900000 - (Date.now() - cd.lastUsed.getTime())) / 60000);
    return interaction.editReply(`The animals are spooked, darling. Wait **${mins} minutes** before hunting again.`);
  }

  const inventory = await getInventory(guildId, userId);
  const hasWeapon = inventory.pistol || inventory.rifle || inventory.knife;
  
  if (!hasWeapon) {
    return interaction.editReply("You can't hunt with your bare hands in this wasteland. Go to the `/shop` and buy a weapon first.");
  }

  const outcomes = [
    { msg: "You tracked a wild boar and brought it down.", reward: 150 },
    { msg: "A mangy wolf attacked! You fended it off and harvested the pelt.", reward: 100 },
    { msg: "You found a stray cow. Easy pickings.", reward: 200 },
    { msg: "You spent hours in the woods but found nothing but cold wind.", reward: 0 }
  ];

  const result = outcomes[Math.floor(Math.random() * outcomes.length)];
  const finalReward = result.reward > 0 ? Math.floor(result.reward * (inventory.rifle ? 1.5 : 1)) : 0;

  if (finalReward > 0) {
    await updateBalance(guildId, userId, finalReward);
  }
  await setCooldown(guildId, userId, 'hunt');

  return interaction.editReply(`${result.msg} ${finalReward > 0 ? `You earned **${finalReward} ${config.currencyEmoji}**.` : ""}`);
}
