// events/ready.js
import { Events } from 'discord.js';
import { startWatchdog } from '../utils/watchdog.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client) {
  console.log(`--- The Pariah is lurking as ${client.user.tag} ---`);
  
  startWatchdog(client);
}
