const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const logger = require('../utils/logger');
const Sentry = require('@sentry/node');

/**
 * 
 * @param {import('discord.js').Guild} guild 
 * @param {string} title 
 * @param {string} description 
 * @param {string} hexColor 
 * @param {object} author 
 * @returns 
 */
async function sendAuditLog(guild, title, description, hexColor, author = null) {
    try {
        const config = db.prepare('SELECT auditChannelId FROM guild_config WHERE guildId = ?').get(guild.id);
        if (!config || !config.auditChannelId) return; // Logging disabled or not set

        const logChannel = await guild.channels.fetch(config.auditChannelId).catch(() => null);
        if (!logChannel) return; // Channel deleted

        // Tracked Roles Verification
        const trackedRows = db.prepare('SELECT roleId FROM audit_tracked_roles WHERE guildId = ?').all(guild.id);
        if (trackedRows.length > 0 && author) {
            const member = guild.members.cache.get(author.id) || await guild.members.fetch(author.id).catch(() => null);
            if (member) {
                const trackedRoleIds = new Set(trackedRows.map(r => r.roleId));
                const hasTrackedRole = member.roles.cache.some(role => trackedRoleIds.has(role.id));
                if (!hasTrackedRole) return; // Skip logging because the user does not have a surveilled role
            } else {
                return; // Member left or unavailable, cannot verify roles, so skip to be safe.
            }
        }

        const embed = new EmbedBuilder()
            .setColor(hexColor)
            .setAuthor({ name: title })
            .setDescription(`>>> ${description}`)
            .setTimestamp()
            .setFooter({ text: 'VaultX Audit System' });
            
        if (author) {
            embed.setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() });
        }

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        logger.error({ err: error, guildId: guild.id }, 'Failed to send audit log');
        if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
}

module.exports = { sendAuditLog };
