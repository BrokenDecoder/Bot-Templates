const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        await sendAuditLog(role.guild, '🎭 Role Deleted', `**Role Name:** \`${role.name}\``, 0xED4245);
    }
};
