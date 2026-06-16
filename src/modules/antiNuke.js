const db = require('../database/db');
const { nukeAlertEmbed } = require('../modules/embeds');
const { AuditLogEvent, PermissionsBitField } = require('discord.js');
const { createSilentBackup } = require('../commands/utilities/backup.js');

// ─── Global Threat Tracker (DEFCON) ───────────────────────────────
const globalThreatTracker = new Map();

function trackGlobalThreat(guildId, executorId) {
    const now = Date.now();
    let entry = globalThreatTracker.get(guildId);
    if (!entry || now > entry.resetAt) {
        entry = { executors: new Set([executorId]), resetAt: now + 15000 }; // 15 second window
        globalThreatTracker.set(guildId, entry);
    } else {
        entry.executors.add(executorId);
    }
    return entry.executors.size;
}

async function initiateDefcon(guild) {
    try {
        const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
        if (owner) {
            await owner.send(`🚨 **DEFCON 1 TRIGGERED IN ${guild.name}** 🚨\nMultiple administrators are performing destructive actions simultaneously! The bot has initiated a total server lockdown.`).catch(() => {});
        }

        // 1. Pause Invites
        const invites = await guild.invites.fetch().catch(() => new Map());
        for (const [, invite] of invites) {
            await invite.delete('DEFCON 1 Lockdown').catch(() => {});
        }

        // 2. Strip Dangerous Permissions from ALL roles
        const DANGEROUS_PERMS = [
            PermissionsBitField.Flags.Administrator,
            PermissionsBitField.Flags.ManageGuild,
            PermissionsBitField.Flags.ManageRoles,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageWebhooks,
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.KickMembers
        ];

        for (const role of guild.roles.cache.values()) {
            if (role.managed || role.id === guild.id) continue; // Skip bot roles and @everyone
            
            let hasDangerousPerm = false;
            for (const perm of DANGEROUS_PERMS) {
                if (role.permissions.has(perm)) {
                    hasDangerousPerm = true;
                    break;
                }
            }

            if (hasDangerousPerm) {
                try {
                    const safePerms = role.permissions.remove(DANGEROUS_PERMS);
                    await role.setPermissions(safePerms, 'DEFCON 1 Lockdown - Stripping Admin Permissions');
                } catch (e) {
                    console.error(`[DEFCON] Failed to strip perms from role ${role.name}`);
                }
            }
        }
        console.log(`[DEFCON 1] Lockdown complete in ${guild.name}`);
    } catch (error) {
        console.error('[DEFCON 1] Error during lockdown:', error);
    }
}

// ─── Threshold Tracker ────────────────────────────────────────────
// Tracks how many destructive actions a user did in the last 10 seconds
// Format: { userId: { action: count, resetAt: timestamp } }
const actionTracker = new Map();
const THRESHOLD = 3;        // max actions before triggering
const WINDOW_MS = 10_000;   // 10 second window

function trackAction(userId, action) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = actionTracker.get(key);

    if (!entry || now > entry.resetAt) {
        actionTracker.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return 1;
    }
    entry.count++;
    actionTracker.set(key, entry);
    return entry.count;
}

// ─── Helper: Is Whitelisted ────────────────────────────────────────
function isWhitelisted(userId, guildOwnerId) {
    if (userId === guildOwnerId) return true;
    const row = db.prepare('SELECT 1 FROM whitelist WHERE userId = ?').get(userId);
    return !!row;
}

// ─── Helper: Get security log channel ─────────────────────────────
async function getLogChannel(guild) {
    const row = db.prepare('SELECT logChannelId FROM guild_config WHERE guildId = ?').get(guild.id);
    if (!row?.logChannelId) return null;
    return guild.channels.cache.get(row.logChannelId) || null;
}

// ─── Helper: Fetch Audit Log Executor ─────────────────────────────
async function getAuditExecutor(guild, actionType) {
    try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: actionType });
        const entry = auditLogs.entries.first();
        if (!entry) return null;
        // Ignore stale entries (older than 5s)
        if (Date.now() - entry.createdTimestamp > 5000) return null;
        // Ignore actions performed by the bot itself (like restoring a backup)
        if (entry.executor.id === guild.client.user.id) return null;
        return entry.executor;
    } catch (e) {
        return null;
    }
}

// ─── Helper: Punish rogue user ─────────────────────────────────────
async function punishUser(guild, executor, logChannel, action, target, reason, recovered) {
    let autoAction = 'Logged';
    
    try {
        // Trigger Emergency Backup immediately
        try {
            const backupId = await createSilentBackup(guild);
            if (backupId && logChannel) {
                await logChannel.send(`📸 **Emergency Backup Taken:** \`${backupId}\` (Saved right before punishment)`).catch(() => {});
            }
        } catch (backupError) {
            console.error('[ANTINUKE] Emergency backup failed:', backupError);
        }

        // Trigger DEFCON check
        const threatLevel = trackGlobalThreat(guild.id, executor.id);
        if (threatLevel >= 2) {
            const configRow = db.prepare('SELECT defconEnabled FROM guild_config WHERE guildId = ?').get(guild.id);
            if (configRow && configRow.defconEnabled === 1) {
                await initiateDefcon(guild);
                autoAction += ' | DEFCON 1 INITIATED';
            } else {
                autoAction += ' | DEFCON Offline';
            }
        }

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) {
            // Strip all roles first
            const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id);
            for (const [, role] of rolesToRemove) {
                await member.roles.remove(role).catch(() => {});
            }

            // Ban the rogue user
            await guild.members.ban(executor.id, { reason: `[Anti-Nuke] ${reason}`, deleteMessageSeconds: 0 }).catch(() => {});
            autoAction = 'Roles Stripped → Banned';
        }
    } catch (e) {
        console.error('[ANTINUKE] Failed to punish user:', e);
        autoAction = 'Punishment Failed (Higher Role or Error)';
    }

    // Log to security channel
    if (logChannel) {
        await logChannel.send({ embeds: [nukeAlertEmbed({ action, target, executor, status: 'THREAT NEUTRALIZED', reason, autoAction, recovered })] }).catch(() => {});
    }
}

// ─── THE ANTI-NUKE ENGINE ──────────────────────────────────────────
module.exports = (client) => {

    // ── Anti Channel Create ──────────────────────────────────────
    client.on('channelCreate', async (channel) => {
        try {
            const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate);
            if (!executor || isWhitelisted(executor.id, channel.guild.ownerId)) return;
            const count = trackAction(executor.id, 'channelCreate');
            if (count >= THRESHOLD) {
                await channel.delete().catch(() => {});
                const logChannel = await getLogChannel(channel.guild);
                await punishUser(channel.guild, executor, logChannel, 'Mass Channel Create', `#${channel.name}`, 'Exceeded channel creation threshold', true);
            }
        } catch (e) { console.error('[ANTINUKE:channelCreate]', e.message); }
    });

    // ── Anti Channel Delete ──────────────────────────────────────
    client.on('channelDelete', async (channel) => {
        try {
            const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete);
            if (!executor || isWhitelisted(executor.id, channel.guild.ownerId)) return;
            const count = trackAction(executor.id, 'channelDelete');
            if (count >= THRESHOLD) {
                // Auto-Recover: Recreate the deleted channel
                let recovered = false;
                try {
                    await channel.guild.channels.create({
                        name: channel.name,
                        type: channel.type,
                        parent: channel.parentId,
                        permissionOverwrites: channel.permissionOverwrites.cache.toJSON(),
                        topic: channel.topic,
                    });
                    recovered = true;
                } catch (_) {}
                
                const logChannel = await getLogChannel(channel.guild);
                await punishUser(channel.guild, executor, logChannel, 'Mass Channel Delete', `#${channel.name}`, 'Exceeded channel deletion threshold', recovered);
            }
        } catch (e) { console.error('[ANTINUKE:channelDelete]', e.message); }
    });

    // ── Anti Role Create ──────────────────────────────────────────
    client.on('roleCreate', async (role) => {
        try {
            const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleCreate);
            if (!executor || isWhitelisted(executor.id, role.guild.ownerId)) return;
            const count = trackAction(executor.id, 'roleCreate');
            if (count >= THRESHOLD) {
                await role.delete().catch(() => {});
                const logChannel = await getLogChannel(role.guild);
                await punishUser(role.guild, executor, logChannel, 'Mass Role Create', `@${role.name}`, 'Exceeded role creation threshold', true);
            }
        } catch (e) { console.error('[ANTINUKE:roleCreate]', e.message); }
    });

    // ── Anti Role Delete ──────────────────────────────────────────
    client.on('roleDelete', async (role) => {
        try {
            const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleDelete);
            if (!executor || isWhitelisted(executor.id, role.guild.ownerId)) return;
            const count = trackAction(executor.id, 'roleDelete');
            if (count >= THRESHOLD) {
                // Auto-Recover: Recreate role with original permissions
                let recovered = false;
                try {
                    await role.guild.roles.create({
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: role.permissions,
                        mentionable: role.mentionable,
                    });
                    recovered = true;
                } catch (_) {}
                
                const logChannel = await getLogChannel(role.guild);
                await punishUser(role.guild, executor, logChannel, 'Mass Role Delete', `@${role.name}`, 'Exceeded role deletion threshold', recovered);
            }
        } catch (e) { console.error('[ANTINUKE:roleDelete]', e.message); }
    });

    // ── Anti Role Permission Abuse ────────────────────────────────
    // Monitors for roles being given dangerous permissions
    client.on('roleUpdate', async (oldRole, newRole) => {
        try {
            const DANGEROUS_PERMS = [
                PermissionsBitField.Flags.Administrator,
                PermissionsBitField.Flags.ManageGuild,
                PermissionsBitField.Flags.ManageRoles,
                PermissionsBitField.Flags.BanMembers,
                PermissionsBitField.Flags.KickMembers,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ManageWebhooks,
            ];

            const addedDangerousPerms = DANGEROUS_PERMS.some(p =>
                !oldRole.permissions.has(p) && newRole.permissions.has(p)
            );

            if (!addedDangerousPerms) return;

            const executor = await getAuditExecutor(newRole.guild, AuditLogEvent.RoleUpdate);
            if (!executor || isWhitelisted(executor.id, newRole.guild.ownerId)) return;

            // Auto-Recover: Revert permissions
            let recovered = false;
            try {
                await newRole.setPermissions(oldRole.permissions);
                recovered = true;
            } catch (_) {}

            const logChannel = await getLogChannel(newRole.guild);
            await punishUser(newRole.guild, executor, logChannel, 'Role Permission Abuse', `@${newRole.name}`, 'Dangerous permissions added to a role', recovered);
        } catch (e) { console.error('[ANTINUKE:roleUpdate]', e.message); }
    });

    // ── Anti Webhook Create ───────────────────────────────────────
    client.on('webhookUpdate', async (channel) => {
        try {
            const executor = await getAuditExecutor(channel.guild, AuditLogEvent.WebhookCreate);
            if (!executor || isWhitelisted(executor.id, channel.guild.ownerId)) return;
            const count = trackAction(executor.id, 'webhookCreate');
            if (count >= THRESHOLD) {
                // Delete all unauthorized webhooks in the channel
                const webhooks = await channel.fetchWebhooks().catch(() => null);
                if (webhooks) {
                    for (const [, wh] of webhooks) {
                        if (wh.owner?.id === executor.id) {
                            await wh.delete('[Anti-Nuke] Unauthorized webhook').catch(() => {});
                        }
                    }
                }
                const logChannel = await getLogChannel(channel.guild);
                await punishUser(channel.guild, executor, logChannel, 'Mass Webhook Create', `#${channel.name}`, 'Exceeded webhook creation threshold', true);
            }
        } catch (e) { console.error('[ANTINUKE:webhookCreate]', e.message); }
    });

    // ── Anti Bot Add ──────────────────────────────────────────────
    client.on('guildMemberAdd', async (member) => {
        try {
            if (!member.user.bot) return;
            
            const executor = await getAuditExecutor(member.guild, AuditLogEvent.BotAdd);
            if (!executor || isWhitelisted(executor.id, member.guild.ownerId)) return;

            // Kick unauthorized bot
            await member.kick('[Anti-Nuke] Unauthorized bot added').catch(() => {});

            const logChannel = await getLogChannel(member.guild);
            if (logChannel) {
                await logChannel.send({ embeds: [nukeAlertEmbed({
                    action: 'Unauthorized Bot Added',
                    target: `${member.user.tag} (Bot)`,
                    executor,
                    status: 'BOT KICKED',
                    reason: 'Non-whitelisted user added a bot',
                    autoAction: 'Bot Kicked',
                    recovered: true
                })] }).catch(() => {});
            }
        } catch (e) { console.error('[ANTINUKE:botAdd]', e.message); }
    });

    // ── Anti Ban Abuse ────────────────────────────────────────────
    client.on('guildBanAdd', async (ban) => {
        try {
            const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
            if (!executor || isWhitelisted(executor.id, ban.guild.ownerId)) return;
            const count = trackAction(executor.id, 'memberBan');
            if (count >= THRESHOLD) {
                // Auto-Recover: Unban the victim
                let recovered = false;
                try {
                    await ban.guild.members.unban(ban.user, '[Anti-Nuke] Mass ban reversed');
                    recovered = true;
                } catch (_) {}
                const logChannel = await getLogChannel(ban.guild);
                await punishUser(ban.guild, executor, logChannel, 'Mass Ban Abuse', `${ban.user.tag}`, 'Exceeded ban threshold', recovered);
            }
        } catch (e) { console.error('[ANTINUKE:banAbuse]', e.message); }
    });

    // ── Anti Kick Abuse ───────────────────────────────────────────
    client.on('guildMemberRemove', async (member) => {
        try {
            if (member.user.bot) return;
            const executor = await getAuditExecutor(member.guild, AuditLogEvent.MemberKick);
            if (!executor || isWhitelisted(executor.id, member.guild.ownerId)) return;
            const count = trackAction(executor.id, 'memberKick');
            if (count >= THRESHOLD) {
                const logChannel = await getLogChannel(member.guild);
                await punishUser(member.guild, executor, logChannel, 'Mass Kick Abuse', member.user.tag, 'Exceeded kick threshold', false);
            }
        } catch (e) { console.error('[ANTINUKE:kickAbuse]', e.message); }
    });

    // ── Anti Server Update ────────────────────────────────────────
    client.on('guildUpdate', async (oldGuild, newGuild) => {
        try {
            const executor = await getAuditExecutor(newGuild, AuditLogEvent.GuildUpdate);
            if (!executor || isWhitelisted(executor.id, newGuild.ownerId)) return;

            // Revert if server name or icon changed
            let recovered = false;
            try {
                await newGuild.edit({
                    name: oldGuild.name,
                    icon: oldGuild.icon
                        ? `https://cdn.discordapp.com/icons/${oldGuild.id}/${oldGuild.icon}.png`
                        : null,
                });
                recovered = true;
            } catch (_) {}

            const logChannel = await getLogChannel(newGuild);
            await punishUser(newGuild, executor, logChannel, 'Unauthorized Server Update', newGuild.name, 'Server settings changed by non-whitelisted user', recovered);
        } catch (e) { console.error('[ANTINUKE:guildUpdate]', e.message); }
    });

    // ── Anti Everyone/Here Spam ───────────────────────────────────
    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || message.author.bot) return;
            if (!message.mentions.everyone) return; // Only react to @everyone / @here
            if (isWhitelisted(message.author.id, message.guild.ownerId)) return;

            const count = trackAction(message.author.id, 'everyonePing');
            if (count >= 2) { // Stricter threshold for mass pings
                await message.delete().catch(() => {});
                await message.member.timeout(5 * 60 * 1000, '[Anti-Nuke] Mass @everyone spam').catch(() => {});
                const logChannel = await getLogChannel(message.guild);
                if (logChannel) {
                    await logChannel.send({ embeds: [nukeAlertEmbed({
                        action: 'Anti @everyone Spam',
                        target: `#${message.channel.name}`,
                        executor: message.author,
                        status: 'MESSAGE DELETED',
                        reason: 'Repeated @everyone/@here pings',
                        autoAction: 'Message Deleted + Timed Out (5m)',
                        recovered: true
                    })] }).catch(() => {});
                }
            }
        } catch (e) { console.error('[ANTINUKE:everyoneSpam]', e.message); }
    });

    // ── Anti Prune ───────────────────────────────────────────────
    client.on('guildMembersChunk', async (members, guild) => {
        try {
            const executor = await getAuditExecutor(guild, AuditLogEvent.MemberPrune);
            if (!executor || isWhitelisted(executor.id, guild.ownerId)) return;
            const logChannel = await getLogChannel(guild);
            if (logChannel) {
                await logChannel.send({ embeds: [nukeAlertEmbed({
                    action: 'Server Member Prune Detected',
                    target: `${members.size} members`,
                    executor,
                    status: 'LOGGED',
                    reason: 'Member prune by non-whitelisted user',
                    autoAction: 'Logged (Cannot reverse prune)',
                    recovered: false
                })] }).catch(() => {});
            }
            await punishUser(guild, executor, logChannel, 'Unauthorized Member Prune', `${members.size} members`, 'Member prune triggered', false);
        } catch (e) { console.error('[ANTINUKE:prune]', e.message); }
    });

    console.log('[ANTINUKE] ✅ All protection systems active.');
};
