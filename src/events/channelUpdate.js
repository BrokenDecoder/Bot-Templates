const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        // Name change
        if (oldChannel.name !== newChannel.name) {
            await sendAuditLog(newChannel.guild, '📁 Channel Renamed', `**Channel:** <#${newChannel.id}>\n\n**[OLD]** \`${oldChannel.name}\`\n**[NEW]** \`${newChannel.name}\``, 0xFEE75C);
        }

        // Topic change
        if (oldChannel.topic !== newChannel.topic) {
            await sendAuditLog(newChannel.guild, '📝 Channel Topic Changed', `**Channel:** <#${newChannel.id}>\n\n**[OLD]**\n\`\`\`\n${oldChannel.topic || 'None'}\n\`\`\`\n**[NEW]**\n\`\`\`\n${newChannel.topic || 'None'}\n\`\`\``, 0xFEE75C);
        }
    }
};
