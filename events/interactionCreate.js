// events/interactionCreate.js
import { 
  Events, 
  MessageFlags, 
  ChannelSelectMenuBuilder, 
  RoleSelectMenuBuilder, 
  ActionRowBuilder, 
  ChannelType 
} from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.InteractionCreate;

export async function execute(interaction, client) {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Shadows in the code.', flags: [MessageFlags.Ephemeral] });
      }
    }
  }

  if (interaction.isButton()) {
    // Platform Role Mapping Buttons
    const platformMatch = interaction.customId.match(/^setup_btn_link_(xbox|ps|steam)$/);
    if (platformMatch) {
      const platform = platformMatch[1];
      const menu = new RoleSelectMenuBuilder()
        .setCustomId(`setup_menu_link_${platform}`)
        .setPlaceholder(`Select the ${platform.toUpperCase()} Linked Role`);

      return await interaction.reply({ 
        content: `Which role is assigned when a user links their **${platform.toUpperCase()}** account?`, 
        components: [new ActionRowBuilder().addComponents(menu)], 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Standard Dashboard Buttons
    if (interaction.customId === 'setup_btn_channels') {
      const menu = new ChannelSelectMenuBuilder().setCustomId('setup_menu_log').setPlaceholder('Select log channel').addChannelTypes(ChannelType.GuildText);
      return await interaction.reply({ content: 'Log channel:', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }

    // ... (rest of your existing button logic for welcome/mod roles)
  }

  if (interaction.isAnySelectMenu()) {
    const configRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('guild_configs').doc(interaction.guild.id);

    // Handle Platform Role Selection
    const platformMenuMatch = interaction.customId.match(/^setup_menu_link_(xbox|ps|steam)$/);
    if (platformMenuMatch) {
      const platform = platformMenuMatch[1];
      const roleId = interaction.values[0];
      await configRef.set({ [`${platform}RoleId`]: roleId }, { merge: true });
      return await interaction.update({ content: `✅ **${platform.toUpperCase()}** role mapped to <@&${roleId}>.`, components: [] });
    }

    // Standard Menu Logic
    if (interaction.customId === 'setup_menu_log') {
      await configRef.set({ logChannelId: interaction.values[0] }, { merge: true });
      return await interaction.update({ content: `✅ Log channel updated.`, components: [] });
    }
    // ... (rest of your menu logic)
  }
}
