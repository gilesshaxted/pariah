// events/interactionCreate.js
import { 
  Events, 
  MessageFlags, 
  ChannelSelectMenuBuilder, 
  RoleSelectMenuBuilder, 
  ActionRowBuilder, 
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { db } from '../utils/firebase.js';
import { getMemberLevel } from '../utils/modUtils.js';

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
    // --- SOCIAL CONTRACT & VERIFICATION ---
    if (interaction.customId === 'accept_rules') {
      return await interaction.reply({ 
        content: "Contract accepted. Use `/register [gamertag]` to finish.", 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // --- MODERATION SETUP DASHBOARD ---
    if (interaction.customId === 'setup_btn_channels') {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_menu_log')
        .setPlaceholder('Select the moderation log channel')
        .addChannelTypes(ChannelType.GuildText);

      return await interaction.reply({ 
        content: 'Select the channel where I should file my reports:', 
        components: [new ActionRowBuilder().addComponents(menu)], 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    if (interaction.customId === 'setup_btn_welcome') {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_menu_welcome')
        .setPlaceholder('Select the welcome channel')
        .addChannelTypes(ChannelType.GuildText);

      return await interaction.reply({ 
        content: 'Select where I should greet new survivors:', 
        components: [new ActionRowBuilder().addComponents(menu)], 
        flags: [MessageFlags.Ephemeral] 
      });
    }

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

    // --- ECONOMY SETUP DASHBOARD ---
    if (interaction.customId === 'eco_setup_currency') {
      const modal = new ModalBuilder()
        .setCustomId('eco_modal_currency')
        .setTitle('Economy: Currency Configuration');

      const nameInput = new TextInputBuilder()
        .setCustomId('eco_input_name')
        .setLabel("Currency Name (e.g. Scrap, Bottlecaps)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const emojiInput = new TextInputBuilder()
        .setCustomId('eco_input_emoji')
        .setLabel("Currency Emoji (e.g. ⚙️, 🪙)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(emojiInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'eco_setup_daily') {
      const modal = new ModalBuilder()
        .setCustomId('eco_modal_daily')
        .setTitle('Economy: Daily Rewards');

      const amountInput = new TextInputBuilder()
        .setCustomId('eco_input_daily')
        .setLabel("Amount given for /daily")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. 100")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
      return await interaction.showModal(modal);
    }

    // --- LINKED ROLES: MAIN ACCOUNT SELECTION ---
    if (interaction.customId.startsWith('main_acc_')) {
      const platform = interaction.customId.split('_')[2];
      const userId = interaction.user.id;
      const member = await interaction.guild.members.fetch(userId);

      const level = await getMemberLevel(member);
      if (level > 0) {
        return await interaction.reply({ 
          content: "You are part of the administration, darling. I wouldn't dream of forcing a name change on you.", 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      try {
        const playerDoc = await db.collection('pariah_players').doc(userId).get();
        if (!playerDoc.exists) {
          return await interaction.reply({ 
            content: "I couldn't find your registration record. Please run `/register` first, love.", 
            flags: [MessageFlags.Ephemeral] 
          });
        }

        const gamertag = playerDoc.data()[`${platform}_tag`] || playerDoc.data().gamertag;
        await member.setNickname(gamertag);

        await interaction.update({ 
          content: `✅ Perfect. I've set your server nickname to match your **${platform.toUpperCase()}** tag: \`${gamertag}\`.`, 
          components: [] 
        });

      } catch (error) {
        console.error('[NICKNAME ERROR]', error);
        await interaction.reply({ content: "I encountered a shadow while changing your name.", flags: [MessageFlags.Ephemeral] });
      }
    }
  }

  // 3. Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    const configRef = db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('economy_configs').doc(interaction.guild.id);

    if (interaction.customId === 'eco_modal_currency') {
      const name = interaction.fields.getTextInputValue('eco_input_name');
      const emoji = interaction.fields.getTextInputValue('eco_input_emoji');
      
      await configRef.set({ currencyName: name, currencyEmoji: emoji }, { merge: true });
      await interaction.reply({ content: `✅ Currency updated to **${emoji} ${name}**.`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === 'eco_modal_daily') {
      const amount = parseInt(interaction.fields.getTextInputValue('eco_input_daily'));
      if (isNaN(amount)) return interaction.reply({ content: "That isn't a valid number, darling.", flags: [MessageFlags.Ephemeral] });
      
      await configRef.set({ dailyAmount: amount }, { merge: true });
      await interaction.reply({ content: `✅ Daily reward set to **${amount}**.`, flags: [MessageFlags.Ephemeral] });
    }
  }

  // 4. Handle Select Menus
  if (interaction.isAnySelectMenu()) {
    const configRef = db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(interaction.guild.id);

    if (interaction.customId === 'setup_menu_log') {
      const channelId = interaction.values[0];
      await configRef.set({ logChannelId: channelId }, { merge: true });
      await interaction.update({ content: `✅ Log channel updated to <#${channelId}>.`, components: [] });
    }

    if (interaction.customId === 'setup_menu_welcome') {
      const channelId = interaction.values[0];
      await configRef.set({ welcomeChannelId: channelId }, { merge: true });
      await interaction.update({ content: `✅ Welcome channel updated to <#${channelId}>.`, components: [] });
    }

    if (interaction.customId === 'setup_menu_roles') {
      const roleIds = interaction.values;
      await configRef.set({ modRoleIds: roleIds }, { merge: true });
      await interaction.update({ content: `✅ Moderator roles updated.`, components: [] });
    }
  }
}
