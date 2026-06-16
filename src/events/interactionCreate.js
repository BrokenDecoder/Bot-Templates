const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Defer reply immediately to prevent DiscordAPIError[10062] Unknown Interaction
        // This gives the command up to 15 minutes to execute instead of 3 seconds
        try {
            await interaction.deferReply();
        } catch (e) {
            console.error('[INTERACTION] Failed to defer reply:', e.message);
            return;
        }

        try {
            if (command.executeSlash) {
                await command.executeSlash(interaction, client);
            } else {
                await interaction.editReply({ content: 'This command only supports prefix usage currently.' });
            }
        } catch (error) {
            console.error(`[ERROR] Command: ${interaction.commandName}`, error.message);
            try {
                await interaction.editReply({ content: '❌ There was an error executing this command!' });
            } catch (e) {}
        }
    },
};
