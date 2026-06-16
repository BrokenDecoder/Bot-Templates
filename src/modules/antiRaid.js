const { nukeAlertEmbed } = require('./embeds');

// Tracks join velocity per guild
// Format: { guildId: { joins: number, resetAt: timestamp } }
const joinTracker = new Map();
const JOIN_THRESHOLD = 10;
const JOIN_WINDOW_MS = 5000; // 5 seconds

module.exports = (client) => {
    client.on('guildMemberAdd', async (member) => {
        try {
            const guild = member.guild;
            const now = Date.now();
            let entry = joinTracker.get(guild.id);

            if (!entry || now > entry.resetAt) {
                entry = { joins: 1, resetAt: now + JOIN_WINDOW_MS };
                joinTracker.set(guild.id, entry);
            } else {
                entry.joins++;
            }

            if (entry.joins >= JOIN_THRESHOLD) {
                // Raid Detected!
                
                // 1. Elevate verification level to Highest (Requires Phone)
                try {
                    await guild.setVerificationLevel(4, 'Anti-Raid: Botnet detected');
                } catch (e) {
                    console.error('[ANTIRAID] Failed to set verification level:', e);
                }

                // 2. Pause active invites
                try {
                    const invites = await guild.invites.fetch().catch(() => new Map());
                    for (const [, invite] of invites) {
                        await invite.delete('Anti-Raid Lockdown').catch(() => {});
                    }
                } catch (e) {
                    console.error('[ANTIRAID] Failed to delete invites:', e);
                }

                // 3. Log to security channel
                const db = require('../database/db');
                const row = db.prepare('SELECT logChannelId FROM guild_config WHERE guildId = ?').get(guild.id);
                if (row && row.logChannelId) {
                    const logChannel = guild.channels.cache.get(row.logChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [nukeAlertEmbed({
                            action: 'Anti-Raid System Triggered',
                            target: 'Server Invites & Security',
                            executor: member.user, // The latest bot that tripped the wire
                            status: 'SERVER LOCKED DOWN',
                            reason: `High join velocity detected (${JOIN_THRESHOLD}+ joins in 5s)`,
                            autoAction: 'Verification set to Highest, Invites Deleted',
                            recovered: true
                        })] }).catch(() => {});
                    }
                }

                console.log(`[ANTIRAID] 🚨 Botnet raid detected and locked down in ${guild.name}`);
                
                // Reset tracker to prevent spamming the lockdown
                joinTracker.delete(guild.id);
            }
        } catch (error) {
            console.error('[ANTIRAID] Error in join event:', error);
        }
    });

    console.log('[ANTIRAID] ✅ Join-Gate engine active.');
};
