// events/guildMemberAdd.js
import { Events, EmbedBuilder } from 'discord.js';
import { db } from '../utils/firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

export const name = Events.GuildMemberAdd;

const welcomeMessages = [
  "A new survivor emerges from the fog. Welcome to the wasteland, {user}.",
  "Step into the light, {user}. The social contract awaits in the rules channel.",
  "Another soul for the machine. Glad you found us, {user}.",
  "The Pariah watches as {user} crosses the threshold. Stay sharp.",
  "Check your gear, {user}. This isn't Kansas anymore.",
  "Welcome to the collective, {user}. Mind the rules and the shadows.",
  "A fresh face in a weary world. Welcome, {user}. Make yourself useful.",
  "The gates creak open for {user}. Tread carefully, darling.",
  "Look who found the secret entrance. Welcome to the frequency, {user}.",
  "Establishing connection... {user} has successfully joined the network.",
  "Welcome, {user}. We've been expecting someone of your... caliber.",
  "The wasteland just got a bit more interesting. Welcome, {user}."
];

export async function execute(member) {
  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('guild_configs').doc(member.guild.id).get();

    if (!doc.exists || !doc.data().welcomeChannelId) return;

    const channelId = doc.data().welcomeChannelId;
    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    
    if (!channel) return;

    // Pick a random message
    const rawMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const personalizedMessage = rawMessage.replace('{user}', `<@${member.id}>`);

    const embed = new EmbedBuilder()
      .setTitle('New Arrival')
      .setDescription(personalizedMessage)
      .setColor(0xcc0000)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[WELCOME ERROR]', error);
  }
}
