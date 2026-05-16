// commands/economy/daily.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getEcoConfig, updateBalance, checkCooldown, setCooldown } from '../../utils/economyUtils.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily allowance of currency');

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const config = await getEcoConfig(guildId);
  
  const cooldown = await checkCooldown(guildId, userId, 'daily');
  
  if (!cooldown.ready) {
    const nextAvailable = new Date(cooldown.lastUsed.getTime() + 86400000);
    if (Date.now() < nextAvailable.getTime()) {
      const hoursLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / 3600000);
      return await interaction.editReply({ 
        content: `Patience, darling. You've already collected today. Come back in about **${hoursLeft} hours**.` 
      });
    }
  }

  const newBalance = await updateBalance(guildId, userId, config.dailyAmount);
  await setCooldown(guildId, userId, 'daily');

  await interaction.editReply({ 
    content: `✅ You've claimed your daily **${config.dailyAmount} ${config.currencyEmoji} ${config.currencyName}**. Your current stash: **${newBalance}**.` 
  });
}
