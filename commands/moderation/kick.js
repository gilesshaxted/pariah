// commands/moderation/kick.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction, canModerate } from '../../utils/modUtils.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Remove a member from the server')
  .addUserOption(option => option.setName('target').setDescription('Member to kick').setRequired(true))
  .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
  // 1. Defer immediately
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const target = interaction.options.getUser('target');
  const targetMember = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason');

  if (!targetMember) return interaction.editReply({ content: "I can't kick a ghost." });

  // --- HIERARCHY CHECK ---
  const authorized = await canModerate(interaction.member, targetMember);
  if (!authorized) {
    return await interaction.editReply({ 
      content: "You lack the authority to discipline this individual. Check your station, darling." 
    });
  }

  try {
    await targetMember.kick(reason);

    const caseId = await logAction(interaction.client, {
      guild: interaction.guild,
      target: target,
      moderator: interaction.user,
      type: 'KICK',
      reason: reason
    });

    await interaction.editReply({ content: `✅ **Case #${caseId}**: ${target.tag} has been removed from the wasteland.` });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: "This person is rooted too deep for me to move. Check my permissions." });
  }
}
