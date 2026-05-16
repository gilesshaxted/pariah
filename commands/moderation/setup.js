// commands/moderation/setup.js
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { db } from '../../utils/firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure The Pariah for your server')
  .addChannelOption(option => 
    option.setName('log_channel')
      .setDescription('Where should I post moderation logs?')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addRoleOption(option => 
    option.setName('mod_role')
      .setDescription('Which role defines your moderators?')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const logChannel = interaction.options.getChannel('log_channel');
  const modRole = interaction.options.getRole('mod_role');

  try {
    await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(interaction.guild.id).set({
        logChannelId: logChannel.id,
        modRoleId: modRole.id,
        setupBy: interaction.user.id,
        updatedAt: new Date()
      }, { merge: true });

    await interaction.reply({ 
      content: `✅ **Setup Complete.** Logs will go to <#${logChannel.id}> and moderators are defined by <@&${modRole.id}>.`, 
      ephemeral: true 
    });
  } catch (error) {
    console.error('[SETUP ERROR]', error);
    await interaction.reply({ content: "Failed to save configuration. Check logs, darling.", ephemeral: true });
  }
}
