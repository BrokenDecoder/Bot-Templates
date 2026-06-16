const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, modActionEmbed, dmPunishEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'jail',
    slashData: new SlashCommandBuilder()
        .setName('jail')
        .setDescription('Jail a user — strips all roles and locks them to a jail channel.')
        .addSubcommand(sub => sub.setName('add').setDescription('Jail a user.')
            .addUserOption(opt => opt.setName('target').setDescription('User to jail').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Release a user from jail.')
            .addUserOption(opt => opt.setName('target').setDescription('User to release').setRequired(true)))
        .addSubcommand(sub => sub.setName('setup').setDescription('Setup the jail role & channel.')),

    async execute(message, args, client) {
        if (!message.member.permissions.has('ModerateMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission.')] });

        const sub = args[0];

        if (sub === 'setup') {
            return handleSetup(message.guild, message.author, (embed) => message.reply({ embeds: [embed] }));
        }

        if (sub === 'add') {
            const target = message.mentions.users.first();
            if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.jail add @user [reason]`')] });
            const reason = args.slice(2).join(' ') || 'No reason provided';
            return handleJail(message.guild, target, message.author, reason, (embed) => message.reply({ embeds: [embed] }), client);
        }

        if (sub === 'remove') {
            const target = message.mentions.users.first();
            if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.jail remove @user`')] });
            return handleUnjail(message.guild, target, message.author, (embed) => message.reply({ embeds: [embed] }));
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.jail setup` | `.jail add @user` | `.jail remove @user`')] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('ModerateMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission.')] });

        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            return handleSetup(interaction.guild, interaction.user, (embed) => interaction.editReply({ embeds: [embed] }));
        }

        if (sub === 'add') {
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            return handleJail(interaction.guild, target, interaction.user, reason, (embed) => interaction.editReply({ embeds: [embed] }), client);
        }

        if (sub === 'remove') {
            const target = interaction.options.getUser('target');
            return handleUnjail(interaction.guild, target, interaction.user, (embed) => interaction.editReply({ embeds: [embed] }));
        }
    }
};

async function handleSetup(guild, executor, reply) {
    // Create jail role if it doesn't exist
    let jailRole = guild.roles.cache.find(r => r.name === '🔒 Jailed');
    if (!jailRole) {
        jailRole = await guild.roles.create({
            name: '🔒 Jailed',
            color: 0x36393f,
            permissions: [],
            reason: 'Jail system setup'
        });
    }

    // Deny all channels access for this role
    for (const [, channel] of guild.channels.cache) {
        await channel.permissionOverwrites.edit(jailRole, {
            ViewChannel: false,
            SendMessages: false,
            AddReactions: false,
            Connect: false
        }).catch(() => {});
    }

    // Create jail channel
    let jailChannel = guild.channels.cache.find(c => c.name === 'jail');
    if (!jailChannel) {
        jailChannel = await guild.channels.create({
            name: 'jail',
            permissionOverwrites: [
                { id: guild.id, deny: ['ViewChannel'] },
                { id: jailRole.id, allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }
            ]
        });
    } else {
        await jailChannel.permissionOverwrites.edit(jailRole, { ViewChannel: true, ReadMessageHistory: true, SendMessages: false });
    }

    // Save config
    db.prepare('UPDATE guild_config SET jailRoleId = ? WHERE guildId = ?').run(jailRole.id, guild.id);

    return reply(successEmbed('Jail Setup Complete', `Jail role: ${jailRole}\nJail channel: ${jailChannel}\n\nAll channels have been configured.`));
}

async function handleJail(guild, target, executor, reason, reply, client) {
    const config = db.prepare('SELECT jailRoleId FROM guild_config WHERE guildId = ?').get(guild.id);
    if (!config?.jailRoleId) return reply(errorEmbed('Not Configured', 'Run `.jail setup` or `/jail setup` first to configure the jail system.'));

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) return reply(errorEmbed('Not Found', 'That user is not in this server.'));

    // Save current roles then strip
    const savedRoles = member.roles.cache
        .filter(r => r.id !== guild.id && r.id !== config.jailRoleId)
        .map(r => r.id);

    db.prepare('INSERT OR REPLACE INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)').run(target.id, executor.id, `[JAIL] ${reason}`);

    // Strip all roles
    for (const [, role] of member.roles.cache) {
        if (role.id !== guild.id) {
            await member.roles.remove(role).catch(() => {});
        }
    }
    // Add jail role
    await member.roles.add(config.jailRoleId).catch(() => {});

    try { await target.send({ embeds: [dmPunishEmbed({ action: 'Jailed', reason, guildName: guild.name })] }); } catch (_) {}

    return reply(modActionEmbed({ action: '🔒 User Jailed', target, executor, reason }));
}

async function handleUnjail(guild, target, executor, reply) {
    const config = db.prepare('SELECT jailRoleId FROM guild_config WHERE guildId = ?').get(guild.id);
    if (!config?.jailRoleId) return reply(errorEmbed('Not Configured', 'Jail system is not set up.'));

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) return reply(errorEmbed('Not Found', 'That user is not in this server.'));

    await member.roles.remove(config.jailRoleId).catch(() => {});

    return reply(successEmbed('User Released', `**${target.tag}** has been released from jail.`));
}
