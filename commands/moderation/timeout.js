// commands/moderation/timeout.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logAction } from '../../utils/modUtils.js';

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
  const target = interaction.options.getMember('target');
  const duration = parseInt(interaction.options.getString('duration'));
  const reason = interaction.options.getString('reason');

  if (!target) return interaction.reply({ content: "That user isn't in this wasteland, darling.", flags: [MessageFlags.Ephemeral] });
  if (!target.moderatable) return interaction.reply({ content: "I lack the authority to silence this individual.", flags: [MessageFlags.Ephemeral] });

  await target.timeout(duration, reason);

  const caseId = await logAction(interaction.client, {
    guild: interaction.guild,
    target: target.user,
    moderator: interaction.user,
    type: 'TIMEOUT',
    reason: reason,
    duration: interaction.options.get('duration').name
  });

  await interaction.reply({ content: `✅ **Case #${caseId}**: ${target.user.tag} has been silenced.`, flags: [MessageFlags.Ephemeral] });
}
