const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');
const crypto = require('crypto');

module.exports = {
    name: 'backup',
    slashData: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Manage Time Machine Server Backups (Owner Only).')
        .addSubcommand(sub => sub.setName('create').setDescription('Create a complete snapshot of the server.'))
        .addSubcommand(sub => sub.setName('list').setDescription('List all available server backups.'))
        .addSubcommand(sub => sub.setName('load').setDescription('Restore the server from a backup (DESTRUCTIVE).').addStringOption(opt => opt.setName('id').setDescription('The backup ID').setRequired(true))),

    async execute(message, args, client) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ **SECURITY BLOCK:** Only the Server Owner can manage backups.');
        }

        const action = args[0]?.toLowerCase();

        if (action === 'create') {
            return handleCreate(message.guild, (msg) => message.reply(msg));
        } else if (action === 'list') {
            return handleList(message.guild, (msg) => message.reply(msg));
        } else if (action === 'load') {
            const backupId = args[1];
            if (!backupId) return message.reply('❌ Please provide a backup ID to load. Use `v backup list` to see available backups.');
            return handleLoad(message, backupId, client);
        }

        message.reply('Usage:\n`v backup create`\n`v backup list`\n`v backup load <id>`');
    },

    async executeSlash(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.editReply({ content: '❌ **SECURITY BLOCK:** Only the Server Owner can manage backups.' });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            return handleCreate(interaction.guild, (msg) => interaction.editReply(msg));
        } else if (subcommand === 'list') {
            return handleList(interaction.guild, (msg) => interaction.editReply(msg));
        } else if (subcommand === 'load') {
            const backupId = interaction.options.getString('id');
            return handleLoad(interaction, backupId, client);
        }
    },
    createSilentBackup
};

async function createSilentBackup(guild) {
    try {
        const roles = guild.roles.cache
            .filter(r => !r.managed && r.id !== guild.id)
            .map(r => ({
                name: r.name,
                color: r.hexColor,
                hoist: r.hoist,
                permissions: r.permissions.bitfield.toString(),
                position: r.position
            }))
            .sort((a, b) => a.position - b.position);

        const categories = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .map(c => ({
                name: c.name,
                position: c.position,
                permissionOverwrites: c.permissionOverwrites.cache.map(p => ({
                    type: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString(),
                    roleName: p.type === 0 ? guild.roles.cache.get(p.id)?.name : null
                }))
            }));

        const channels = guild.channels.cache
            .filter(c => c.type !== ChannelType.GuildCategory)
            .map(c => ({
                name: c.name,
                type: c.type,
                parentName: c.parent ? c.parent.name : null,
                position: c.position,
                topic: c.topic || null,
                nsfw: c.nsfw || false,
                bitrate: c.bitrate || null,
                userLimit: c.userLimit || null,
                permissionOverwrites: c.permissionOverwrites.cache.map(p => ({
                    type: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString(),
                    roleName: p.type === 0 ? guild.roles.cache.get(p.id)?.name : null
                }))
            }));

        const data = JSON.stringify({ roles, categories, channels });
        const backupId = 'EMERGENCY-' + crypto.randomUUID().slice(0, 5);

        db.prepare('INSERT INTO backups (id, guildId, data) VALUES (?, ?, ?)').run(backupId, guild.id, data);
        logger.info({ guildId: guild.id, backupId }, 'Silent Emergency Backup Created');
        return backupId;
    } catch (error) {
        logger.error({ err: error, guildId: guild.id }, 'Failed to create emergency backup');
        return null;
    }
}

async function handleCreate(guild, reply) {
    await reply({ content: '🔄 Scanning server and creating snapshot...' });
    const backupId = await createSilentBackup(guild);
    
    if (!backupId) {
        return reply({ content: '❌ Failed to create backup.' });
    }

    const backupRow = db.prepare('SELECT data FROM backups WHERE id = ?').get(backupId);
    const parsed = JSON.parse(backupRow.data);

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '✅ Backup Complete' })
        .setDescription(`>>> The server state has been successfully saved.\n\n**Backup ID:** \`${backupId}\`\n*Keep this ID safe. You will need it to restore the server.*`)
        .setFooter({ text: 'VaultX Time Machine' })
        .setTimestamp();

    return reply({ embeds: [embed] });
}

async function handleList(guild, reply) {
    const rows = db.prepare('SELECT id, timestamp FROM backups WHERE guildId = ? ORDER BY timestamp DESC LIMIT 10').all(guild.id);
    
    if (rows.length === 0) {
        return reply({ content: 'No backups found for this server. Run `v backup create` to make one.' });
    }

    const listString = rows.map((r, i) => `**${i + 1}.** \`${r.id}\` - Created at: <t:${Math.floor(new Date(r.timestamp).getTime() / 1000)}:f>`).join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '📦 Available Server Backups' })
        .setDescription(`>>> ${listString}`)
        .setFooter({ text: 'VaultX Time Machine' })
        .setTimestamp();

    return reply({ embeds: [embed] });
}

async function handleLoad(interactionOrMessage, backupId, client) {
    const guild = interactionOrMessage.guild;
    const authorId = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    
    const backupRow = db.prepare('SELECT data, timestamp FROM backups WHERE id = ?').get(backupId);
    
    if (!backupRow) {
        const replyFn = interactionOrMessage.editReply || interactionOrMessage.reply;
        return replyFn.call(interactionOrMessage, { content: `❌ Backup \`${backupId}\` not found.` });
    }

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '⚠️ Destructive Restore Warning' })
        .setDescription(`>>> You are about to restore Backup \`${backupId}\` (Created: <t:${Math.floor(new Date(backupRow.timestamp).getTime() / 1000)}:f>).\n\n**CRITICAL:** This action will instantly **DELETE** existing channels or roles depending on what you choose to restore.\n\n⚠️ **API LIMIT WARNING:** Discord limits role creation to 250 roles per day. If you hit this limit, the bot will automatically skip the remaining roles.`)
        .setFooter({ text: 'This action cannot be undone.' });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('restore_options')
        .setPlaceholder('Select what to restore...')
        .setMinValues(1)
        .setMaxValues(4)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Wipe & Restore Roles')
                .setDescription('DESTRUCTIVE: Deletes current roles, then restores from backup.')
                .setValue('roles_wipe'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Wipe & Restore Channels')
                .setDescription('DESTRUCTIVE: Deletes current channels, then restores from backup.')
                .setValue('channels_wipe'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Merge Missing Roles')
                .setDescription('SAFE: Only creates roles that are missing. No deletions.')
                .setValue('roles_append'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Merge Missing Channels')
                .setDescription('SAFE: Only creates channels that are missing. No deletions.')
                .setValue('channels_append')
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const confirmBtn = new ButtonBuilder().setCustomId('confirm_restore').setLabel('CONFIRM RESTORE').setStyle(ButtonStyle.Danger).setEmoji('💥').setDisabled(true);
    const cancelBtn = new ButtonBuilder().setCustomId('cancel_restore').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
    const btnRow = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    let replyMessage;
    if (interactionOrMessage.editReply) {
        replyMessage = await interactionOrMessage.editReply({ embeds: [embed], components: [selectRow, btnRow] });
    } else {
        replyMessage = await interactionOrMessage.reply({ embeds: [embed], components: [selectRow, btnRow] });
    }

    // Increase timeout to 5 minutes so users have enough time to read the warning and make selections
    const collector = replyMessage.createMessageComponentCollector({ filter: i => i.user.id === authorId, time: 300000 });

    let selectedOptions = [];

    collector.on('collect', async i => {
        if (i.customId === 'cancel_restore') {
            await i.update({ content: '✅ Restore cancelled.', embeds: [], components: [] });
            collector.stop();
            return;
        }

        if (i.customId === 'restore_options') {
            selectedOptions = i.values;
            confirmBtn.setDisabled(false);
            await i.update({ components: [selectRow, new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)] });
        }

        if (i.customId === 'confirm_restore') {
            await i.update({ content: '🔄 **INITIATING SERVER RECONSTRUCTION...**\nI will DM you when the restore is complete.', embeds: [], components: [] });
            collector.stop();
            
            try {
                const owner = await client.users.fetch(authorId).catch(() => null);
                let progressMsg = null;
                if (owner) {
                    progressMsg = await owner.send('🔄 **Starting VaultX Time Machine Restore...**\n*Calculating operations...*').catch(() => null);
                }

                let lastUpdate = 0;
                const updateProgress = async (content) => {
                    if (progressMsg && Date.now() - lastUpdate > 2000) {
                        lastUpdate = Date.now();
                        await progressMsg.edit(content).catch(() => null);
                    }
                };

                const options = {
                    restoreRoles: selectedOptions.includes('roles_wipe') || selectedOptions.includes('roles_append'),
                    restoreChannels: selectedOptions.includes('channels_wipe') || selectedOptions.includes('channels_append'),
                    wipeRoles: selectedOptions.includes('roles_wipe'),
                    wipeChannels: selectedOptions.includes('channels_wipe')
                };

                await reconstructServer(guild, JSON.parse(backupRow.data), updateProgress, options);
                
                if (progressMsg) {
                    await progressMsg.edit(`✅ **VaultX Time Machine:** Server \`${guild.name}\` has been successfully restored from backup \`${backupId}\`!`).catch(() => null);
                } else if (owner) {
                    owner.send(`✅ **VaultX Time Machine:** Server \`${guild.name}\` has been successfully restored from backup \`${backupId}\`!`).catch(() => null);
                }
            } catch (error) {
                logger.error({ err: error, guildId: guild.id }, 'Reconstruction Failed');
            }
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            if (interactionOrMessage.editReply) {
                interactionOrMessage.editReply({ content: '❌ Restore request timed out.', embeds: [], components: [] }).catch(() => {});
            } else {
                replyMessage.edit({ content: '❌ Restore request timed out.', embeds: [], components: [] }).catch(() => {});
            }
        }
    });
}

async function reconstructServer(guild, data, updateProgress, options) {
    logger.info({ guildId: guild.id }, 'Commencing reconstruction');

    const { restoreRoles, restoreChannels, wipeRoles, wipeChannels } = options;

    let deletedChannels = 0;
    const totalChannelsToNuke = wipeChannels ? guild.channels.cache.size : 0;
    let deletedRoles = 0;
    const totalRolesToNuke = wipeRoles ? guild.roles.cache.filter(r => !r.managed && r.id !== guild.id).size : 0;
    
    let createdRoles = 0;
    const totalRolesToCreate = restoreRoles ? data.roles.length : 0;
    let createdCategories = 0;
    const totalCategoriesToCreate = restoreChannels ? data.categories.length : 0;
    let createdChannels = 0;
    const totalChannelsToCreate = restoreChannels ? data.channels.length : 0;

    const renderProgress = () => {
        let msg = `🔄 **VaultX Time Machine Reconstruction In Progress...**\n\n`;
        if (wipeChannels || wipeRoles) {
            msg += `🗑️ **Phase 1: Erasing Server**\n`;
            if (wipeChannels) msg += `> Channels Deleted: \`${deletedChannels}/${totalChannelsToNuke}\`\n`;
            if (wipeRoles) msg += `> Roles Deleted: \`${deletedRoles}/${totalRolesToNuke}\`\n`;
            msg += `\n`;
        }
        msg += `🏗️ **Phase 2: Rebuilding Blueprint**\n`;
        if (restoreRoles) msg += `> Roles Restored: \`${createdRoles}/${totalRolesToCreate}\`\n`;
        if (restoreChannels) msg += `> Categories Restored: \`${createdCategories}/${totalCategoriesToCreate}\`\n`;
        if (restoreChannels) msg += `> Channels Restored: \`${createdChannels}/${totalChannelsToCreate}\`\n`;
        msg += `\n*(Note: Large role restorations might skip roles due to Discord's 250 roles/day limit)*`;
        return msg;
    };

    if (updateProgress) await updateProgress(renderProgress());

    if (wipeChannels) {
        // nuke channels
        for (const channel of guild.channels.cache.values()) {
            await channel.delete().catch(() => null);
            deletedChannels++;
            if (updateProgress && deletedChannels % 5 === 0) await updateProgress(renderProgress());
        }
        if (updateProgress) await updateProgress(renderProgress());
    }

    if (wipeRoles) {
        // nuke roles
        for (const role of guild.roles.cache.values()) {
            if (!role.managed && role.id !== guild.id) {
                await role.delete().catch(() => null);
                deletedRoles++;
                if (updateProgress && deletedRoles % 5 === 0) await updateProgress(renderProgress());
            }
        }
        if (updateProgress) await updateProgress(renderProgress());
    }

    const roleMapping = {}; 
    if (restoreRoles) {
        for (const roleData of data.roles) {
            let createdRole = null;
            if (!wipeRoles) {
                const existing = guild.roles.cache.find(r => r.name === roleData.name);
                if (existing) createdRole = existing;
            }

            if (!createdRole) {
                createdRole = await guild.roles.create({
                    name: roleData.name,
                    color: roleData.color,
                    hoist: roleData.hoist,
                    permissions: roleData.permissions ? BigInt(roleData.permissions) : undefined,
                    reason: 'VaultX Backup Restore'
                }).catch(() => null);
            }
            
            if (createdRole) roleMapping[createdRole.name] = createdRole.id;
            createdRoles++;
            if (updateProgress && createdRoles % 5 === 0) await updateProgress(renderProgress());
        }
        if (updateProgress) await updateProgress(renderProgress());
    }

    const categoryMapping = {}; 
    if (restoreChannels) {
        for (const catData of data.categories) {
            let createdCat = null;
            if (!wipeChannels) {
                const existing = guild.channels.cache.find(c => c.name === catData.name && c.type === ChannelType.GuildCategory);
                if (existing) createdCat = existing;
            }

            if (!createdCat) {
                let overwrites = [];
                if (catData.permissionOverwrites) {
                    for (const p of catData.permissionOverwrites) {
                        if (p.type === 0 && p.roleName && roleMapping[p.roleName]) {
                            overwrites.push({
                                id: roleMapping[p.roleName],
                                allow: BigInt(p.allow),
                                deny: BigInt(p.deny)
                            });
                        } else if (p.type === 0 && p.roleName === '@everyone') {
                            overwrites.push({
                                id: guild.id,
                                allow: BigInt(p.allow),
                                deny: BigInt(p.deny)
                            });
                        }
                    }
                }

                createdCat = await guild.channels.create({
                    name: catData.name,
                    type: ChannelType.GuildCategory,
                    position: catData.position,
                    permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
                    reason: 'VaultX Backup Restore'
                }).catch(() => null);
            }

            if (createdCat) categoryMapping[createdCat.name] = createdCat.id;
            createdCategories++;
            if (updateProgress && createdCategories % 3 === 0) await updateProgress(renderProgress());
        }
        if (updateProgress) await updateProgress(renderProgress());

        for (const chanData of data.channels) {
            let createdChan = null;
            if (!wipeChannels) {
                const existing = guild.channels.cache.find(c => c.name === chanData.name && c.type === chanData.type);
                if (existing) createdChan = existing;
            }

            if (!createdChan) {
                let overwrites = [];
                if (chanData.permissionOverwrites) {
                    for (const p of chanData.permissionOverwrites) {
                        if (p.type === 0 && p.roleName && roleMapping[p.roleName]) {
                            overwrites.push({
                                id: roleMapping[p.roleName],
                                allow: BigInt(p.allow),
                                deny: BigInt(p.deny)
                            });
                        } else if (p.type === 0 && p.roleName === '@everyone') {
                            overwrites.push({
                                id: guild.id,
                                allow: BigInt(p.allow),
                                deny: BigInt(p.deny)
                            });
                        }
                    }
                }

                createdChan = await guild.channels.create({
                    name: chanData.name,
                    type: chanData.type,
                    parent: chanData.parentName ? categoryMapping[chanData.parentName] : undefined,
                    position: chanData.position,
                    topic: chanData.topic || undefined,
                    nsfw: chanData.nsfw || undefined,
                    bitrate: chanData.bitrate || undefined,
                    userLimit: chanData.userLimit || undefined,
                    permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
                    reason: 'VaultX Backup Restore'
                }).catch(() => null);
            }
            createdChannels++;
            if (updateProgress && createdChannels % 5 === 0) await updateProgress(renderProgress());
        }
        if (updateProgress) await updateProgress(renderProgress());
    }

    logger.info({ guildId: guild.id }, 'Reconstruction finished');
}
