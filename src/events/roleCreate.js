const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        await sendAuditLog(role.guild, '🎭 Role Created', `**Role:** <@&${role.id}>\n**Color:** \`${role.hexColor}\``, 0x57F287);
    }
};
