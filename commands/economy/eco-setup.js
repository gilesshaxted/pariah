// commands/economy/eco-setup.js
import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageFlags 
} from 'discord.js';
import { getEcoConfig } from '../../utils/economyUtils.js';

export const data = new SlashCommandBuilder()
  .setName('eco-setup')
  .setDescription('Configure the server economy')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const config = await getEcoConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('💰 Economy Configuration')
    .setDescription('Adjust your wasteland currency and rewards.')
    .addFields(
      { name: 'Currency', value: `${config.currencyEmoji} ${config.currencyName}`, inline: true },
      { name: 'Daily Reward', value: `${config.currencyEmoji} ${config.dailyAmount}`, inline: true }
    )
    .setColor(0x00AE86);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('eco_setup_currency')
      .setLabel('Set Currency Name/Emoji')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('eco_setup_daily')
      .setLabel('Set Daily Amount')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
}
