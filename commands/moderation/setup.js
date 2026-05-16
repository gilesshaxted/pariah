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

export async function getSetupEmbed(guild) {
  const doc = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('guild_configs').doc(guild.id).get();

  const config = doc.exists ? doc.data() : {};
  
  const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : '*Not Set*';
  const welcomeChannel = config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : '*Not Set*';
  
  // Platform Role Mapping Display
  const xboxRole = config.xboxRoleId ? `<@&${config.xboxRoleId}>` : '*Not Set*';
  const psRole = config.psRoleId ? `<@&${config.psRoleId}>` : '*Not Set*';
  const steamRole = config.steamRoleId ? `<@&${config.steamRoleId}>` : '*Not Set*';

  return new EmbedBuilder()
    .setTitle('🛠️ The Pariah: Configuration Dashboard')
    .setDescription('Manage your server infrastructure. Ensure your "Linked Roles" are mapped so I can sync identities.')
    .addFields(
      { name: '📡 Log Channel', value: logChannel, inline: true },
      { name: '👋 Welcome Channel', value: welcomeChannel, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '🎮 Xbox Role', value: xboxRole, inline: true },
      { name: '🟦 PS Role', value: psRole, inline: true },
      { name: '⚙️ Steam Role', value: steamRole, inline: true }
    )
    .setColor(0x2b2d31)
    .setFooter({ text: 'Henge Digital Infrastructure' })
    .setTimestamp();
}

export async function execute(interaction) {
  const embed = await getSetupEmbed(interaction.guild);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_btn_channels').setLabel('Log Channel').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_btn_welcome').setLabel('Welcome Channel').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_btn_roles').setLabel('Mod Roles').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_btn_link_xbox').setLabel('Map Xbox Role').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_btn_link_ps').setLabel('Map PS Role').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_btn_link_steam').setLabel('Map Steam Role').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ 
    embeds: [embed], 
    components: [row1, row2], 
    ephemeral: true 
  });
}
