// commands/moderation/setup.js
import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { db } from '../../utils/firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Open the Pariah Configuration Dashboard')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/**
 * Helper to build the dashboard embed with all current settings
 */
export async function getSetupEmbed(guild) {
  const doc = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('guild_configs').doc(guild.id).get();

  const config = doc.exists ? doc.data() : {};
  
  const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : '*Not Set*';
  const welcomeChannel = config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : '*Not Set*';
  const modRoles = config.modRoleIds?.length > 0 
    ? config.modRoleIds.map(id => `<@&${id}>`).join(', ') 
    : '*Not Set*';

  return new EmbedBuilder()
    .setTitle('🛠️ The Pariah: Configuration Dashboard')
    .setDescription('Manage your server settings below. Use the buttons to adjust your channels and roles.')
    .addFields(
      { name: '📡 Log Channel', value: logChannel, inline: true },
      { name: '👋 Welcome Channel', value: welcomeChannel, inline: true },
      { name: '🛡️ Moderator Roles', value: modRoles, inline: false }
    )
    .setColor(0x2b2d31)
    .setFooter({ text: 'Henge Digital Infrastructure' })
    .setTimestamp();
}

export async function execute(interaction) {
  const embed = await getSetupEmbed(interaction.guild);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_btn_channels')
      .setLabel('Set Log Channel')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_btn_welcome')
      .setLabel('Set Welcome Channel')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setup_btn_roles')
      .setLabel('Set Mod Roles')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ 
    embeds: [embed], 
    components: [row], 
    ephemeral: true 
  });
}
