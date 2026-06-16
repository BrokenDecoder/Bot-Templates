const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;
        await sendAuditLog(channel.guild, '📁 Channel Deleted', `**Name:** \`${channel.name}\`\n**Type:** \`${channel.type}\``, 0xED4245);
    }
};
