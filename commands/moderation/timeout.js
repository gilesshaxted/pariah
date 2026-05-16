// commands/moderation/timeout.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction, canModerate } from '../../utils/modUtils.js';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Temporarily silence a member')
  .addUserOption(option => option.setName('target').setDescription('Member to timeout').setRequired(true))
  .addStringOption(option => 
    option.setName('duration')
      .setDescription('Duration of the timeout')
      .setRequired(true)
      .addChoices(
        { name: '60 Seconds', value: '60000' },
        { name: '5 Minutes', value: '300000' },
        { name: '1 Hour', value: '3600000' },
        { name: '24 Hours', value: '86400000' },
        { name: '1 Week', value: '604800000' }
      ))
  .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  // 1. Defer immediately to prevent "Unknown interaction" timeout
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const target = interaction.options.getUser('target');
  const targetMember = interaction.options.getMember('target');
  const duration = parseInt(interaction.options.getString('duration'));
  const reason = interaction.options.getString('reason');

  if (!targetMember) return interaction.editReply({ content: "That user isn't in this wasteland, darling." });
  if (target.bot) return interaction.editReply({ content: "You cannot silence a machine." });

  // --- HIERARCHY CHECK ---
  const authorized = await canModerate(interaction.member, targetMember);
  if (!authorized) {
    return await interaction.editReply({ 
      content: "You lack the authority to discipline this individual. Check your station, darling." 
    });
  }

  try {
    await targetMember.timeout(duration, reason);

    const caseId = await logAction(interaction.client, {
      guild: interaction.guild,
      target: target,
      moderator: interaction.user,
      type: 'TIMEOUT',
      reason: reason,
      duration: interaction.options.get('duration').name
    });

    await interaction.editReply({ content: `✅ **Case #${caseId}**: ${target.tag} has been silenced.` });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: "I couldn't apply the timeout. Check my permissions, love." });
  }
}
