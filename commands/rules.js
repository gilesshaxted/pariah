// commands/rules.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('rules')
  .setDescription('Display the server social contract and verification button');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('The Pariah: Social Contract')
    .setDescription('Welcome to our Deadside community. To maintain a high-quality environment, we require all players to verify.\n\n**Rules:**\n1. No toxicity or griefing.\n2. You must link your gamertag within 45 minutes of joining the game server.\n3. Failure to verify results in an automated ban.')
    .setColor(0xcc0000)
    .setFooter({ text: 'The Pariah is watching.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('accept_rules')
      .setLabel('I Accept & Understand')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
