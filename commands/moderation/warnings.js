// commands/moderation/warnings.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { db } from '../../utils/firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View history for a member')
  .addUserOption(option => option.setName('target').setDescription('The user to check').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('target');
  
  const snapshot = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('modlogs')
    .where('targetId', '==', target.id)
    .where('guildId', '==', interaction.guild.id)
    .get();

  if (snapshot.empty) {
    return interaction.reply({ content: `**${target.tag}** has a pristine record.`, flags: [MessageFlags.Ephemeral] });
  }

  const embed = new EmbedBuilder()
    .setTitle(`Case History: ${target.tag}`)
    .setColor(0xCC0000)
    .setThumbnail(target.displayAvatarURL());

  const logs = snapshot.docs
    .map(doc => doc.data())
    .sort((a, b) => b.caseId - a.caseId); // Sort by Case Number descending

  logs.forEach(log => {
    const date = log.timestamp.toDate().toLocaleDateString('en-GB');
    embed.addFields({ 
      name: `Case #${log.caseId} [${log.type}]`, 
      value: `**Date:** ${date}\n**Reason:** ${log.reason}\n**Mod:** <@${log.moderatorId}>` 
    });
  });

  await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}
