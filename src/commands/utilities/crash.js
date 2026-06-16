const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'crash',
    slashData: new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Test command to trigger an error for Sentry (Owner Only).'),

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Nice try.');
        }

        message.reply('🧨 Triggering a simulated database failure for Sentry...');
        
        // Throw an unhandled error to trigger the global uncaughtException handler
        setTimeout(() => {
            throw new Error('VaultX Simulated Database Failure: This is a test error sent to Sentry!');
        }, 1000);
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply('❌ Nice try.');
        }

        await interaction.reply('🧨 Triggering a simulated database failure for Sentry...');
        
        setTimeout(() => {
            throw new Error('VaultX Simulated Database Failure: This is a test error sent to Sentry!');
        }, 1000);
    }
};
