const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;
        await sendAuditLog(channel.guild, '📁 Channel Created', `**Name:** <#${channel.id}> (\`${channel.name}\`)\n**Type:** \`${channel.type}\``, 0x57F287);
    }
};
