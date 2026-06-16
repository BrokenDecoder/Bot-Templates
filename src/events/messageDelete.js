const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild) return;
        if (message.partial || !message.author) return;
        if (message.author.bot) return;

        const text = message.content || '*No content or attachment only*';
        const description = `**User:** <@${message.author.id}>\n**Channel:** <#${message.channel.id}>\n\n**[DELETED TEXT]**\n\`\`\`\n${text}\n\`\`\``;

        await sendAuditLog(message.guild, '🗑️ Message Deleted', description, 0xED4245, message.author); // Red
    }
};
