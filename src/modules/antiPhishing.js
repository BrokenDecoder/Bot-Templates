const { nukeAlertEmbed } = require('./embeds');

const SCAM_REGEX = [
    /discord(?:\.gift|\.com\/gifts|\.me\/gift)/i, // Discord gift scams
    /nitro.*free/i,
    /free.*nitro/i,
    /steam.*(?:free|nitro|discord)/i,
    /discord.*(?:events|promo|hypesquad|mod)/i, // Fake discord domains
    /free.*robux/i,
    /discor(?:b|cl|d-app|dapp|dl|d-gift|d-nitro|ds|d-promo|d-staff|d-events|d-mod|d-hypesquad|d-verify)\.(?:com|org|net|info|ru|xyz|cc)/i // Common typosquatting
];

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || message.author.bot) return;

            const content = message.content.toLowerCase();
            const isScam = SCAM_REGEX.some(regex => regex.test(content));

            if (isScam) {
                // Delete message immediately
                await message.delete().catch(() => {});

                const guild = message.guild;
                const member = message.member;

                if (member) {
                    // Quarantine the user: strip roles and timeout
                    try {
                        const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id);
                        for (const [, role] of rolesToRemove) {
                            await member.roles.remove(role).catch(() => {});
                        }
                        
                        // 24 hour timeout
                        await member.timeout(24 * 60 * 60 * 1000, '[Anti-Scam] Phishing link detected').catch(() => {});
                    } catch (e) {
                        console.error('[ANTISCAM] Failed to quarantine user:', e);
                    }
                }

                // Log it to audit config if exists
                const db = require('../database/db');
                const row = db.prepare('SELECT logChannelId FROM guild_config WHERE guildId = ?').get(guild.id);
                if (row && row.logChannelId) {
                    const logChannel = guild.channels.cache.get(row.logChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [nukeAlertEmbed({
                            action: 'Anti-Phishing Triggered',
                            target: `#${message.channel.name}`,
                            executor: message.author,
                            status: 'MESSAGE DELETED & USER QUARANTINED',
                            reason: 'User posted a known phishing/scam link',
                            autoAction: 'Message Deleted, Roles Stripped, User Timed Out (24h)',
                            recovered: true
                        })] }).catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.error('[ANTISCAM] Error processing message:', error);
        }
    });

    console.log('[ANTISCAM] ✅ Anti-Phishing engine active.');
};
