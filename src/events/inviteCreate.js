const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite) {
        const inviter = invite.inviter ? `<@${invite.inviter.id}>` : 'Unknown';
        const expires = invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never';
        const maxUses = invite.maxUses === 0 ? 'Unlimited' : invite.maxUses;

        await sendAuditLog(invite.guild, '🔗 Invite Created', `**Creator:** ${inviter}\n**Code:** \`${invite.code}\`\n**Channel:** <#${invite.channelId}>\n**Max Uses:** ${maxUses}\n**Expires:** ${expires}`, 0x57F287, invite.inviter);
    }
};
