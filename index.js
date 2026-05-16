// index.js - Updated with Recursive Command Loading
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, GatewayIntentBits, REST, Routes, Partials } from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User]
});

client.commands = new Collection();
const commandsJSON = [];

/**
 * Recursively load commands from subdirectories
 */
const loadCommands = async (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      // Create a relative path for the import
      const relativePath = './' + path.relative(__dirname, fullPath).replace(/\\/g, '/');
      const command = await import(relativePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsJSON.push(command.data.toJSON());
      }
    }
  }
};

// 1. Load Everything
const startBot = async () => {
  await loadCommands(path.join(__dirname, 'commands'));

  // Load Events
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const event = await import(`./events/${file}`);
    client[event.once ? 'once' : 'on'](event.name, (...args) => event.execute(...args, client));
  }

  // Auto-Deploy
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`[SYSTEM] Syncing ${commandsJSON.length} commands across folders...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsJSON },
    );
  } catch (error) {
    console.error('[DEPLOY ERROR]', error);
  }

  client.login(process.env.DISCORD_TOKEN);
};

startBot();
