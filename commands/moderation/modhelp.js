// commands/moderation/modhelp.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('modhelp')
  .setDescription('Staff Handbook: How to moderate with The Pariah')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ The Pariah: Staff Protocol')
    .setDescription('Welcome to the moderation suite. Below is your guide to maintaining order in the wasteland.')
    .setColor(0x2b2d31)
    .addFields(
      { 
        name: '🔨 Slash Commands', 
        value: '• `/warn <user> <reason>` - Issues a formal warning and DMs the user.\n• `/timeout <user> <duration> <reason>` - Silences them for a set time.\n• `/kick <user> <reason>` - Removes them from the server.\n• `/ban <user> <reason> [days]` - Permanent removal and optional message wipe.\n• `/warnings <user>` - View a user’s full case history.\n• `/clearwarning <caseId>` - Striking a specific case from the record.' 
      },
      { 
        name: '✨ Emoji Moderation (Quick Actions)', 
        value: 'React to any message to take instant action. The bot will delete the message and log the evidence.\n⚠️ **Warn**: Formal warning.\n🔇 **Mute**: 1-hour timeout.\n👢 **Kick**: Removes the user from the server.\n🚩 **Flag**: Deletes message and alerts the mod-logs.'
      },
      { 
        name: '⚖️ The Chain of Command', 
        value: 'Hierarchy is enforced. You can only moderate those **below** your station:\n• **Owner**: Final authority.\n• **Admin**: Can moderate Moderators and Users.\n• **Moderator**: Can moderate Users.' 
      },
      { 
        name: '📝 Documentation', 
        value: 'All actions are logged with Case IDs in the designated log channel. When using Emoji Moderation, the bot automatically captures the message content and attachments as evidence.' 
      }
    )
    .setFooter({ text: 'Henge Digital Infrastructure | The Pariah' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}
