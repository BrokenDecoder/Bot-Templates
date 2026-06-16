const { sendAuditLog } = require('../modules/auditLogger');
const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        if (oldState.member?.user.bot) return;

        const user = newState.member?.user || oldState.member?.user;
        if (!user) return;

        // Joined
        if (!oldState.channelId && newState.channelId) {
            await sendAuditLog(newState.guild, '🎙️ Voice Joined', `**User:** <@${user.id}>\n**Channel:** <#${newState.channelId}>`, 0x57F287, user); // Green
        }
        // Left
        else if (oldState.channelId && !newState.channelId) {
            await sendAuditLog(newState.guild, '🎙️ Voice Left', `**User:** <@${user.id}>\n**Channel:** <#${oldState.channelId}>`, 0xED4245, user); // Red
        }
        // Moved
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await sendAuditLog(newState.guild, '🎙️ Voice Moved', `**User:** <@${user.id}>\n**From:** <#${oldState.channelId}>\n**To:** <#${newState.channelId}>`, 0xFEE75C, user); // Yellow
        }
        // Server Muted / Deafened
        else if (!oldState.serverMute && newState.serverMute) {
            await sendAuditLog(newState.guild, '🔇 Server Muted', `**User:** <@${user.id}>\n**Channel:** <#${newState.channelId}>`, 0xED4245, user);
        }
        else if (!oldState.serverDeaf && newState.serverDeaf) {
            await sendAuditLog(newState.guild, '🔇 Server Deafened', `**User:** <@${user.id}>\n**Channel:** <#${newState.channelId}>`, 0xED4245, user);
        }
    }
};
