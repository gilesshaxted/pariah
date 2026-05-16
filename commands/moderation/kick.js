// commands/moderation/kick.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction } from '../../utils/modUtils.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Remove a member from the server')
  .addUserOption(option => option.setName('target').setDescription('Member to kick').setRequired(true))
  .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
  const target = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason');

  if (!target) return interaction.reply({ content: "I can't kick a ghost.", flags: [MessageFlags.Ephemeral] });
  if (!target.kickable) return interaction.reply({ content: "This person is rooted too deep for me to move.", flags: [MessageFlags.Ephemeral] });

  await target.kick(reason);

  const caseId = await logAction(interaction.client, {
    guild: interaction.guild,
    target: target.user,
    moderator: interaction.user,
    type: 'KICK',
    reason: reason
  });

  await interaction.reply({ content: `✅ **Case #${caseId}**: ${target.user.tag} has been removed.`, flags: [MessageFlags.Ephemeral] });
}
