const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const accountAge = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        await sendAuditLog(member.guild, '📥 Member Joined', `**User:** <@${member.user.id}>\n**Account Created:** ${accountAge}`, 0x57F287, member.user);
    }
};
