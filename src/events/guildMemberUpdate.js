const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (newMember.user.bot) return;

        // Nickname change
        if (oldMember.nickname !== newMember.nickname) {
            const oldNick = oldMember.nickname || oldMember.user.username;
            const newNick = newMember.nickname || newMember.user.username;
            await sendAuditLog(newMember.guild, '📝 Nickname Changed', `**User:** <@${newMember.user.id}>\n\n**[BEFORE]** \`${oldNick}\`\n**[AFTER]** \`${newNick}\``, 0xFEE75C, newMember.user);
        }

        // Role changes
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0) {
                const rolesText = addedRoles.map(r => `<@&${r.id}>`).join(', ');
                await sendAuditLog(newMember.guild, '🎭 Roles Added', `**User:** <@${newMember.user.id}>\n**Roles:** ${rolesText}`, 0x57F287, newMember.user);
            }
            if (removedRoles.size > 0) {
                const rolesText = removedRoles.map(r => `<@&${r.id}>`).join(', ');
                await sendAuditLog(newMember.guild, '🎭 Roles Removed', `**User:** <@${newMember.user.id}>\n**Roles:** ${rolesText}`, 0xED4245, newMember.user);
            }
        }

        // Timeout (Communication Disabled)
        if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
            await sendAuditLog(newMember.guild, '⏱️ User Timed Out', `**User:** <@${newMember.user.id}>\n**Expires:** <t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`, 0xED4245, newMember.user);
        }
    }
};
