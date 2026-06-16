const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { modActionEmbed, errorEmbed, dmPunishEmbed } = require('../../modules/embeds');

// Parse duration string like "10m", "2h", "1d" to milliseconds
function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = value * map[unit];
    // Discord max timeout: 28 days
    if (ms > 28 * 86400000) return null;
    return ms;
}

function formatDuration(ms) {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    if (ms < 86400000) return `${ms / 3600000}h`;
    return `${ms / 86400000}d`;
}

module.exports = {
    name: 'timeout',
    slashData: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Temporarily mute a user (timeout).')
        .addUserOption(opt => opt.setName('target').setDescription('The user to timeout').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for timeout').setRequired(false)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('ModerateMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission.')] });

        const target = message.mentions.users.first();
        const durationStr = args[1];
        if (!target || !durationStr) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.timeout @user 10m [reason]`\nValid units: `s`, `m`, `h`, `d`')] });

        const ms = parseDuration(durationStr);
        if (!ms) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like `10m`, `2h`, `1d`. Max 28 days.')] });

        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return message.reply({ embeds: [errorEmbed('Not Found', 'That user is not in this server.')] });
        if (!member.moderatable) return message.reply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot timeout this user — they have a higher or equal role.')] });

        const reason = args.slice(2).join(' ') || 'No reason provided';

        try {
            await member.timeout(ms, reason);
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('API Error', 'Discord rejected the timeout request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, message.author.id, `[TIMEOUT:${formatDuration(ms)}] ${reason}`);

        try { await target.send({ embeds: [dmPunishEmbed({ action: `Timed Out for ${formatDuration(ms)}`, reason, guildName: message.guild.name })] }); } catch (_) {}

        return message.reply({ embeds: [modActionEmbed({ action: '⏱️ User Timed Out', target, executor: message.author, reason, caseid: result.lastInsertRowid, duration: formatDuration(ms) })] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('ModerateMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission.')] });

        const target = interaction.options.getUser('target');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const ms = parseDuration(durationStr);

        if (!ms) return interaction.editReply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like `10m`, `2h`, `1d`. Max 28 days.')] });

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.editReply({ embeds: [errorEmbed('Not Found', 'That user is not in this server.')] });
        if (!member.moderatable) return interaction.editReply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot timeout this user.')] });

        try {
            await member.timeout(ms, reason);
        } catch (error) {
            return interaction.editReply({ embeds: [errorEmbed('API Error', 'Discord rejected the timeout request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, interaction.user.id, `[TIMEOUT:${formatDuration(ms)}] ${reason}`);

        try { await target.send({ embeds: [dmPunishEmbed({ action: `Timed Out for ${formatDuration(ms)}`, reason, guildName: interaction.guild.name })] }); } catch (_) {}

        return interaction.editReply({ embeds: [modActionEmbed({ action: '⏱️ User Timed Out', target, executor: interaction.user, reason, caseid: result.lastInsertRowid, duration: formatDuration(ms) })] });
    }
};
