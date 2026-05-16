// commands/register.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/firebase.js';

export const data = new SlashCommandBuilder()
  .setName('register')
  .setDescription('Link your Deadside Gamertag to your Discord account')
  .addStringOption(option => 
    option.setName('gamertag')
      .setDescription('Your exact in-game name')
      .setRequired(true));

export async function execute(interaction) {
  const gamertag = interaction.options.getString('gamertag');
  
  try {
    await db.collection('pariah_players').doc(gamertag.toLowerCase()).set({
      discordId: interaction.user.id,
      discordTag: interaction.user.tag,
      gamertag: gamertag,
      verified: true,
      verifiedAt: new Date()
    }, { merge: true });

    await interaction.reply({ 
      content: `✅ **The Pariah** has acknowledged you, \`${gamertag}\`. Your registration is complete.`, 
      flags: [MessageFlags.Ephemeral] 
    });
  } catch (error) {
    console.error('[DATABASE ERROR]', error);
    await interaction.reply({ 
      content: "There was an error linking your account. Please try again, darling.", 
      flags: [MessageFlags.Ephemeral] 
    });
  }
}
