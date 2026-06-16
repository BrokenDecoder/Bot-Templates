const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild) return;
        if (oldMessage.partial || !oldMessage.author) return;
        if (oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return; // Often embeds trigger this

        const oldText = oldMessage.content || '*No content*';
        const newText = newMessage.content || '*No content*';

        const description = `**User:** <@${oldMessage.author.id}>\n**Channel:** <#${oldMessage.channel.id}>\n\n**[BEFORE]**\n\`\`\`\n${oldText}\n\`\`\`\n**[AFTER]**\n\`\`\`\n${newText}\n\`\`\``;

        await sendAuditLog(oldMessage.guild, '💬 Message Edited', description, 0xFEE75C, oldMessage.author); // Yellow
    }
};
