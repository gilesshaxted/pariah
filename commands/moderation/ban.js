// commands/moderation/ban.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction, canModerate } from '../../utils/modUtils.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Permanently ban a member')
  .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true))
  .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(true))
  .addIntegerOption(option => 
    option.setName('days')
      .setDescription('Days of message history to delete')
      .setMinValue(0)
      .setMaxValue(7))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  const targetMember = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason');
  const days = interaction.options.getInteger('days') || 0;

  // If the user is in the guild, we check hierarchy
  if (targetMember) {
    const authorized = await canModerate(interaction.member, targetMember);
    if (!authorized) {
      return await interaction.reply({ 
        content: "You lack the authority to discipline this individual. Check your station, darling.", 
        flags: [MessageFlags.Ephemeral] 
      });
    }
  }

  try {
    await interaction.guild.members.ban(target, { reason, deleteMessageSeconds: days * 86400 });

    const caseId = await logAction(interaction.client, {
      guild: interaction.guild,
      target: target,
      moderator: interaction.user,
      type: 'BAN',
      reason: reason
    });

    await interaction.reply({ content: `✅ **Case #${caseId}**: ${target.tag} has been banned.`, flags: [MessageFlags.Ephemeral] });
  } catch (err) {
    await interaction.reply({ content: "I couldn't complete the ban. Perhaps they are already gone?", flags: [MessageFlags.Ephemeral] });
  }
}
