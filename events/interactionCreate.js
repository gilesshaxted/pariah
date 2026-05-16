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
import { getSetupEmbed } from '../commands/moderation/setup.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.InteractionCreate;

export async function execute(interaction, client) {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Shadows in the code. Try again.', flags: [MessageFlags.Ephemeral] });
    }
  }

  // 2. Handle Buttons
  if (interaction.isButton()) {
    // Standard Rule Acceptance
    if (interaction.customId === 'accept_rules') {
      return await interaction.reply({ 
        content: "Contract accepted. Use `/register [gamertag]` to finish.", 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Dashboard: Channel Button
    if (interaction.customId === 'setup_btn_channels') {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_menu_channels')
        .setPlaceholder('Select the moderation log channel')
        .addChannelTypes(ChannelType.GuildText);

      return await interaction.reply({ 
        content: 'Select the channel where I should file my reports:', 
        components: [new ActionRowBuilder().addComponents(menu)], 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Dashboard: Role Button
    if (interaction.customId === 'setup_btn_roles') {
      const menu = new RoleSelectMenuBuilder()
        .setCustomId('setup_menu_roles')
        .setPlaceholder('Select roles that can use moderator commands')
        .setMinValues(1)
        .setMaxValues(5);

      return await interaction.reply({ 
        content: 'Select up to 5 roles to act as my Handlers:', 
        components: [new ActionRowBuilder().addComponents(menu)], 
        flags: [MessageFlags.Ephemeral] 
      });
    }
  }

  // 3. Handle Select Menus (Saving to Firestore)
  if (interaction.isAnySelectMenu()) {
    const configRef = db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(interaction.guild.id);

    if (interaction.customId === 'setup_menu_channels') {
      const channelId = interaction.values[0];
      await configRef.set({ logChannelId: channelId }, { merge: true });
      await interaction.update({ content: `✅ Log channel updated to <#${channelId}>.`, components: [] });
    }

    if (interaction.customId === 'setup_menu_roles') {
      const roleIds = interaction.values;
      await configRef.set({ modRoleIds: roleIds }, { merge: true });
      await interaction.update({ content: `✅ Moderator roles updated.`, components: [] });
    }
  }
}
