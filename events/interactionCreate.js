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
import { getEcoConfig, updateBalance, addItem, getBalance } from '../utils/economyUtils.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.InteractionCreate;

export async function execute(interaction, client) {
  // 1. HANDLE SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      // Fallback for errors if the command hasn't replied or deferred yet
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Shadows in the code. Try again, love.', flags: [MessageFlags.Ephemeral] });
      }
    }
  }

  // 2. HANDLE BUTTONS
  if (interaction.isButton()) {
    // --- Verification Logic ---
    if (interaction.customId === 'accept_rules') {
      return await interaction.reply({ 
        content: "Contract accepted. Use `/register [gamertag]` to finish verification, love.", 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // --- Moderation Setup Dashboard ---
    if (interaction.customId === 'setup_btn_channels') {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_menu_log')
        .setPlaceholder('Select the log channel')
        .addChannelTypes(ChannelType.GuildText);
      return await interaction.reply({ content: 'Where should I file my reports?', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === 'setup_btn_welcome') {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_menu_welcome')
        .setPlaceholder('Select the welcome channel')
        .addChannelTypes(ChannelType.GuildText);
      return await interaction.reply({ content: 'Where should I greet new survivors?', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === 'setup_btn_roles') {
      const menu = new RoleSelectMenuBuilder()
        .setCustomId('setup_menu_roles')
        .setPlaceholder('Select moderator roles')
        .setMinValues(1).setMaxValues(5);
      return await interaction.reply({ content: 'Who are my authorized Handlers?', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }

    // --- Economy Setup Dashboard ---
    if (interaction.customId === 'eco_setup_currency') {
      const modal = new ModalBuilder().setCustomId('eco_modal_currency').setTitle('Currency Config');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eco_input_name').setLabel("Currency Name").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eco_input_emoji').setLabel("Currency Emoji").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'eco_setup_daily') {
      const modal = new ModalBuilder().setCustomId('eco_modal_daily').setTitle('Daily Rewards');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eco_input_daily').setLabel("Reward Amount").setStyle(TextInputStyle.Short).setRequired(true)));
      return await interaction.showModal(modal);
    }

    // --- Shop Transactions ---
    if (interaction.customId.startsWith('eco_buy_')) {
      const itemKey = interaction.customId.replace('eco_buy_', '');
      const config = await getEcoConfig(interaction.guild.id);
      const balance = await getBalance(interaction.guild.id, interaction.user.id);
      
      const shopItems = {
        'knife': { name: 'Hunting Knife', price: 200 },
        'pistol': { name: 'Rusted Pistol', price: 500 },
        'rifle': { name: 'Assault Rifle', price: 1500 },
        'explosives': { name: 'C4 Charge', price: 3000 }
      };

      const item = shopItems[itemKey];
      if (!item) return interaction.reply({ content: "That item has been lost to the fog.", flags: [MessageFlags.Ephemeral] });
      if (balance < item.price) return interaction.reply({ content: `Insufficient ${config.currencyName}. You need **${item.price} ${config.currencyEmoji}**.`, flags: [MessageFlags.Ephemeral] });

      await updateBalance(interaction.guild.id, interaction.user.id, -item.price);
      await addItem(interaction.guild.id, interaction.user.id, itemKey, 1);
      return await interaction.reply({ content: `✅ Purchased **${item.name}** for **${item.price} ${config.currencyEmoji}**.`, flags: [MessageFlags.Ephemeral] });
    }

    // --- Main Account Selection ---
    if (interaction.customId.startsWith('main_acc_')) {
      const platform = interaction.customId.split('_')[2];
      const member = await interaction.guild.members.fetch(interaction.user.id);
      
      // Staff shouldn't have their names forced by the bot
      if (await getMemberLevel(member) > 0) return interaction.reply({ content: "Administrators keep their original titles, darling.", flags: [MessageFlags.Ephemeral] });

      const playerDoc = await db.collection('pariah_players').doc(interaction.user.id).get();
      const gamertag = playerDoc.exists ? (playerDoc.data()[`${platform}_tag`] || playerDoc.data().gamertag) : null;
      
      if (!gamertag) return interaction.reply({ content: "I have no record of that tag. Please `/register` first.", flags: [MessageFlags.Ephemeral] });
      
      await member.setNickname(gamertag);
      await interaction.update({ content: `✅ Nickname synced with your **${platform.toUpperCase()}** tag.`, components: [] });
    }
  }

  // 3. HANDLE MODAL SUBMISSIONS
  if (interaction.isModalSubmit()) {
    const ecoRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('economy_configs').doc(interaction.guild.id);

    if (interaction.customId === 'eco_modal_currency') {
      const name = interaction.fields.getTextInputValue('eco_input_name');
      const emoji = interaction.fields.getTextInputValue('eco_input_emoji');
      await ecoRef.set({ currencyName: name, currencyEmoji: emoji }, { merge: true });
      return await interaction.reply({ content: `✅ Currency updated to **${emoji} ${name}**.`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === 'eco_modal_daily') {
      const amount = parseInt(interaction.fields.getTextInputValue('eco_input_daily'));
      if (isNaN(amount)) return interaction.reply({ content: "That's not a number, love.", flags: [MessageFlags.Ephemeral] });
      await ecoRef.set({ dailyAmount: amount }, { merge: true });
      return await interaction.reply({ content: `✅ Daily reward set to **${amount}**.`, flags: [MessageFlags.Ephemeral] });
    }
  }

  // 4. HANDLE SELECT MENUS
  if (interaction.isAnySelectMenu()) {
    const configRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('guild_configs').doc(interaction.guild.id);

    if (interaction.customId === 'setup_menu_log') {
      await configRef.set({ logChannelId: interaction.values[0] }, { merge: true });
      return await interaction.update({ content: `✅ Log channel updated.`, components: [] });
    }
    if (interaction.customId === 'setup_menu_welcome') {
      await configRef.set({ welcomeChannelId: interaction.values[0] }, { merge: true });
      return await interaction.update({ content: `✅ Welcome channel updated.`, components: [] });
    }
    if (interaction.customId === 'setup_menu_roles') {
      await configRef.set({ modRoleIds: interaction.values }, { merge: true });
      return await interaction.update({ content: `✅ Moderator roles updated.`, components: [] });
    }
  }
}
