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
  const target = interaction.options.getUser('target');
  const targetMember = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason');

  if (!targetMember) return interaction.reply({ content: "I can't kick a ghost.", flags: [MessageFlags.Ephemeral] });

  // --- HIERARCHY CHECK ---
  const authorized = await canModerate(interaction.member, targetMember);
  if (!authorized) {
    return await interaction.reply({ 
      content: "You lack the authority to discipline this individual. Check your station, darling.", 
      flags: [MessageFlags.Ephemeral] 
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

    await interaction.reply({ content: `✅ **Case #${caseId}**: ${target.tag} has been removed.`, flags: [MessageFlags.Ephemeral] });
  } catch (err) {
    await interaction.reply({ content: "This person is rooted too deep for me to move.", flags: [MessageFlags.Ephemeral] });
  }
}
