// commands/moderation/warn.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { logAction, canModerate } from '../../utils/modUtils.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Issue a formal warning to a user')
  .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
  .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  // 1. Defer immediately to buy time for database checks
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const target = interaction.options.getUser('target');
  const targetMember = interaction.options.getMember('target');
  const reason = interaction.options.getString('reason');

  if (target.bot) return interaction.editReply({ content: "You cannot warn a machine, love." });

  // --- HIERARCHY CHECK ---
  if (targetMember) {
    const authorized = await canModerate(interaction.member, targetMember);
    if (!authorized) {
      return await interaction.editReply({ 
        content: "You lack the authority to discipline this individual. Check your station, darling." 
      });
    }
  }

  try {
    const caseId = await logAction(interaction.client, {
      guild: interaction.guild,
      target: target,
      moderator: interaction.user,
      type: 'WARN',
      reason: reason
    });

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Formal Warning Issued')
      .setDescription(`<@${target.id}> has been warned.`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Case ID', value: `\`${caseId}\``, inline: true }
      )
      .setColor(0xFFCC00)
      .setTimestamp();

    // Try to DM the user
    try {
      await target.send(`You have received a warning in **${interaction.guild.name}** for: ${reason}\nCase ID: ${caseId}`);
    } catch (e) {
      console.log("Could not DM user.");
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply({ content: "An error occurred while issuing the warning." });
  }
}
