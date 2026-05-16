// scripts/deploy.js
import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Display the server social contract and verification button'),
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('Link your Deadside Gamertag to your Discord account')
    .addStringOption(option => 
      option.setName('gamertag')
        .setDescription('Your exact in-game name')
        .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Refreshing Slash Commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('Slash Commands successfully deployed.');
  } catch (error) {
    console.error(error);
  }
})();
