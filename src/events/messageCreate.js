const { Events } = require('discord.js');
const rateLimitHandler = require('../handlers/rateLimitHandler');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Support either the custom prefix or mentioning the bot
        const customPrefix = client.prefix;
        const mentionPrefix = `<@${client.user.id}> `;
        let prefix = null;

        if (message.content.startsWith(customPrefix)) {
            prefix = customPrefix;
        } else if (message.content.startsWith(mentionPrefix)) {
            prefix = mentionPrefix;
        } else if (message.content.startsWith('.')) {
             // Fallback default prefix just in case!
             prefix = '.';
        }

        // Ignore messages that don't start with any valid prefix
        if (!prefix) return;

        // Parse command and args
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);

        if (!command) return; // Command not found

        // Rate Limit Check
        if (rateLimitHandler(message.author.id, commandName, client.cooldowns)) {
            return message.reply('You are using commands too fast! Please slow down.');
        }

        try {
            if (command.execute) {
                await command.execute(message, args, client);
            } else {
                await message.reply('This command only supports slash commands (`/`).');
            }
        } catch (error) {
            console.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    },
};
