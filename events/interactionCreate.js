// events/interactionCreate.js
import { Events } from 'discord.js';

export const name = Events.InteractionCreate;

export async function execute(interaction, client) {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'The Pariah encountered a shadow in the code.', ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'accept_rules') {
      await interaction.reply({ 
        content: "Contract accepted. Now use `/register [gamertag]` to finish the process.", 
        ephemeral: true 
      });
    }
  }
}
