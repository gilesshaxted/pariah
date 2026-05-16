// index.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages 
  ] 
});

client.commands = new Collection();

// 1. Load Commands and Prepare for Auto-Deployment
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`./commands/${file}`);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    // Push the JSON data for the REST API
    commandsJSON.push(command.data.toJSON());
  }
}

// 2. Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = await import(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// 3. Auto-Deploy Function
const deployCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`[SYSTEM] Auto-deploying ${commandsJSON.length} slash commands...`);
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsJSON },
    );
    
    console.log('[SYSTEM] Slash commands successfully synchronized with Discord.');
  } catch (error) {
    console.error('[DEPLOY ERROR]', error);
  }
};

// Start the engine
const startBot = async () => {
  // Sync commands with Discord FIRST
  await deployCommands();
  // Then login
  client.login(process.env.DISCORD_TOKEN);
};

startBot();
