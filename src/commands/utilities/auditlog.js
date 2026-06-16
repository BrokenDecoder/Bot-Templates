const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField, RoleSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');

module.exports = {
    name: 'auditlog',
    slashData: new SlashCommandBuilder()
        .setName('auditlog')
        .setDescription('Configure the master Audit Log channel.')
        .addSubcommand(sub => 
            sub.setName('set')
            .setDescription('Set the channel for audit logs.')
            .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send logs to').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('disable')
            .setDescription('Disable audit logging.')
        )
        .addSubcommand(sub =>
            sub.setName('roles')
            .setDescription('Select specific roles to audit (Leave empty to audit everyone).')
        ),

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ You must be an Administrator to configure audit logs.' });
        }

        const action = args[0]?.toLowerCase();
        if (action === 'set') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply('Please mention a valid text channel.');
            return handleSet(message.guild.id, channel.id, (embed) => message.reply({ embeds: [embed] }));
        } else if (action === 'disable') {
            return handleDisable(message.guild.id, (embed) => message.reply({ embeds: [embed] }));
        } else if (action === 'roles') {
            return handleRolesMenu(message, message.guild.id, (data) => message.reply(data));
        }

        message.reply({ content: 'Usage: `v auditlog set #channel` or `v auditlog disable`' });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: '❌ You must be an Administrator to configure audit logs.' });
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'set') {
            const channel = interaction.options.getChannel('channel');
            return handleSet(interaction.guild.id, channel.id, (embed) => interaction.editReply({ embeds: [embed] }));
        } else if (subcommand === 'disable') {
            return handleDisable(interaction.guild.id, (embed) => interaction.editReply({ embeds: [embed] }));
        } else if (subcommand === 'roles') {
            return handleRolesMenu(interaction, interaction.guild.id, (data) => interaction.editReply(data));
        }
    }
};

async function handleSet(guildId, channelId, reply) {
    db.prepare(`
        INSERT INTO guild_config (guildId, auditChannelId)
        VALUES (@guildId, @auditChannelId)
        ON CONFLICT(guildId) DO UPDATE SET auditChannelId = excluded.auditChannelId
    `).run({ guildId, auditChannelId: channelId });

    logger.info({ guildId, auditChannelId: channelId }, 'Audit Log channel configured');

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '✅ Audit Logging Enabled' })
        .setDescription(`─────────────────────────────────\nAll 7 exhaustive tracking modules are now active.\nLogs will be sent to <#${channelId}>.`)
        .setFooter({ text: 'VaultX System' });

    return reply(embed);
}

async function handleDisable(guildId, reply) {
    db.prepare('UPDATE guild_config SET auditChannelId = NULL WHERE guildId = ?').run(guildId);
    
    logger.info({ guildId }, 'Audit Log disabled');

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '❌ Audit Logging Disabled' })
        .setDescription(`─────────────────────────────────\nAudit logging has been safely turned off.`)
        .setFooter({ text: 'VaultX System' });

    return reply(embed);
}

async function handleRolesMenu(messageOrInteraction, guildId, reply) {
    const trackedRows = db.prepare('SELECT roleId FROM audit_tracked_roles WHERE guildId = ?').all(guildId);
    const trackedRoles = trackedRows.map(r => `<@&${r.roleId}>`);
    
    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '🛡️ Tracked Audit Roles' })
        .setDescription(`Select the specific roles you want the Audit System to track from the dropdown below.\n\n**Currently Tracked:**\n${trackedRoles.length > 0 ? trackedRoles.join(', ') : 'None (Everyone is tracked by default)'}`)
        .setFooter({ text: 'VaultX System' });

    const selectMenu = new RoleSelectMenuBuilder()
        .setCustomId('audit_roles_select')
        .setPlaceholder('Select roles to surveil...')
        .setMinValues(0)
        .setMaxValues(20);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const replyMessage = await reply({ embeds: [embed], components: [row] });
    
    // Fallback for interactions vs messages
    const collectorTarget = replyMessage || messageOrInteraction;
    const authorId = messageOrInteraction.user ? messageOrInteraction.user.id : messageOrInteraction.author.id;

    const collector = collectorTarget.createMessageComponentCollector({ filter: i => i.user.id === authorId, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'audit_roles_select') {
            const selectedRoles = i.values; // Array of role IDs

            const transaction = db.transaction((roles) => {
                db.prepare('DELETE FROM audit_tracked_roles WHERE guildId = ?').run(guildId);
                const insert = db.prepare('INSERT INTO audit_tracked_roles (guildId, roleId) VALUES (?, ?)');
                for (const role of roles) {
                    insert.run(guildId, role);
                }
            });

            transaction(selectedRoles);
            logger.info({ guildId, rolesCount: selectedRoles.length }, 'Audit Tracked Roles updated');

            const updatedRoles = selectedRoles.map(r => `<@&${r}>`);
            embed.setDescription(`✅ Successfully updated tracked roles!\n\n**Currently Tracked:**\n${updatedRoles.length > 0 ? updatedRoles.join(', ') : 'None (Everyone is tracked by default)'}`);
            
            await i.update({ embeds: [embed], components: [] });
        }
    });

    collector.on('end', collected => {
        if (replyMessage && replyMessage.edit && collected.size === 0) {
            replyMessage.edit({ components: [] }).catch(() => {});
        }
    });
}
