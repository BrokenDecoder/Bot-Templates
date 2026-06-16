const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        // Name change
        if (oldRole.name !== newRole.name) {
            await sendAuditLog(newRole.guild, '🎭 Role Renamed', `**Role:** <@&${newRole.id}>\n\n**[OLD]** \`${oldRole.name}\`\n**[NEW]** \`${newRole.name}\``, 0xFEE75C);
        }

        // Permissions change
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            await sendAuditLog(newRole.guild, '⚠️ Role Permissions Changed', `**Role:** <@&${newRole.id}> (\`${newRole.name}\`)\nPermissions have been modified. Use \`v roleinfo @role\` to verify new permissions.`, 0xED4245);
        }
    }
};
