// commands/economy/shop.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getEcoConfig, getBalance } from '../../utils/economyUtils.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Browse the wasteland trader\'s wares');

export async function execute(interaction) {
  const config = await getEcoConfig(interaction.guild.id);
  const balance = await getBalance(interaction.guild.id, interaction.user.id);

  const embed = new EmbedBuilder()
    .setTitle('🏚️ Wasteland Trader')
    .setDescription(`"Supply is low, demand is high. What'll it be?"\n\nYour Balance: **${balance} ${config.currencyEmoji} ${config.currencyName}**`)
    .addFields(
      { name: '🔪 Hunting Knife', value: `Cost: 200 ${config.currencyEmoji}\nBasic melee weapon.`, inline: true },
      { name: '🔫 Rusted Pistol', value: `Cost: 500 ${config.currencyEmoji}\nRequired for basic hunting.`, inline: true },
      { name: '🎖️ Assault Rifle', value: `Cost: 1500 ${config.currencyEmoji}\nIncreases hunting yield by 50%.`, inline: true },
      { name: '💣 C4 Charge', value: `Cost: 3000 ${config.currencyEmoji}\nRequired for raiding bases.`, inline: true }
    )
    .setColor(0x7c4dff);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco_buy_knife').setLabel('Buy Knife').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eco_buy_pistol').setLabel('Buy Pistol').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco_buy_rifle').setLabel('Buy Rifle').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco_buy_explosives').setLabel('Buy C4').setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row1, row2], flags: [MessageFlags.Ephemeral] });
}
