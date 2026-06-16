const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // member might be partial if they weren't cached, but usually has user
        if (!member.user) return;
        const joined = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
        await sendAuditLog(member.guild, '📤 Member Left', `**User:** <@${member.user.id}>\n**Had Joined:** ${joined}`, 0xED4245, member.user);
    }
};
