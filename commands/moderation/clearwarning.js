// commands/moderation/clearwarning.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { db } from '../../utils/firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const data = new SlashCommandBuilder()
  .setName('clearwarning')
  .setDescription('Delete a specific moderation case')
  .addIntegerOption(option => option.setName('case').setDescription('The Case Number to remove').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const caseId = interaction.options.getInteger('case');
  
  const snapshot = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('modlogs')
    .where('caseId', '==', caseId)
    .where('guildId', '==', interaction.guild.id)
    .get();

  if (snapshot.empty) {
    return interaction.reply({ content: `I can't find Case #${caseId} in the records.`, flags: [MessageFlags.Ephemeral] });
  }

  // Delete the document
  const docId = snapshot.docs[0].id;
  await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('modlogs').doc(docId).delete();

  await interaction.reply({ content: `✅ **Case #${caseId}** has been struck from the records.`, flags: [MessageFlags.Ephemeral] });
}
