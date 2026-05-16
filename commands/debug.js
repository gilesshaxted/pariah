// commands/debug.js
import { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { GPortalClient } from '../utils/gportal.js';

export const data = new SlashCommandBuilder()
  .setName('debug')
  .setDescription('Test the G-Portal API connection and retrieve server metadata')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // Admin Only

export async function execute(interaction) {
  const clientId = process.env.GPORTAL_CLIENT_ID;
  const clientSecret = process.env.GPORTAL_CLIENT_SECRET;
  const serverId = process.env.GPORTAL_SERVER_ID;

  if (!clientId || !clientSecret || !serverId) {
    return await interaction.reply({
      content: "❌ **Missing G-Portal Credentials.** Please check your `.env` file, darling.",
      flags: [MessageFlags.Ephemeral]
    });
  }

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  try {
    const client = new GPortalClient(clientId, clientSecret);
    const info = await client.getServerInfo(serverId);

    const embed = new EmbedBuilder()
      .setTitle('📡 The Pariah: API Debug')
      .setDescription(`Successfully reached the G-Portal gateway for server: \`${info.name}\``)
      .addFields(
        { name: 'Status', value: info.status, inline: true },
        { name: 'Population', value: `${info.players.current}/${info.players.max}`, inline: true },
        { name: 'IP Address', value: info.address, inline: false }
      )
      .setColor(0x00FF00)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[API DEBUG ERROR]', error);
    await interaction.editReply({ 
      content: "The Pariah reached into the abyss and found nothing. Check your G-Portal logs." 
    });
  }
}
