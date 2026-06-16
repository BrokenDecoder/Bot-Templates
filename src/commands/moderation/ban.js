const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { modActionEmbed, errorEmbed, dmPunishEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'ban',
    slashData: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Permanently ban a user from the server.')
        .addUserOption(opt => opt.setName('target').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban').setRequired(false))
        .addIntegerOption(opt => opt.setName('days').setDescription('Delete message history (days, max 7)').setMinValue(0).setMaxValue(7).setRequired(false)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('BanMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Ban Members** permission.')] });

        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.ban @user [reason]`')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban yourself.')] });
        if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban the bot.')] });

        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (member && !member.bannable)
            return message.reply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot ban this user — they have a higher or equal role.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';

        // DM user before ban (DMs close after ban)
        try { await target.send({ embeds: [dmPunishEmbed({ action: 'Banned', reason, guildName: message.guild.name })] }); } catch (_) {}

        try {
            await message.guild.members.ban(target.id, { reason, deleteMessageSeconds: 0 });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('API Error', 'Discord rejected the ban request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, message.author.id, `[BAN] ${reason}`);

        return message.reply({ embeds: [modActionEmbed({ action: '🔨 User Banned', target, executor: message.author, reason, caseid: result.lastInsertRowid })] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('BanMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Ban Members** permission.')] });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;

        if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban yourself.')] });
        if (target.id === client.user.id) return interaction.editReply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban the bot.')] });

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member && !member.bannable)
            return interaction.editReply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot ban this user — they have a higher or equal role.')] });

        try { await target.send({ embeds: [dmPunishEmbed({ action: 'Banned', reason, guildName: interaction.guild.name })] }); } catch (_) {}

        try {
            await interaction.guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86400 });
        } catch (error) {
            return interaction.editReply({ embeds: [errorEmbed('API Error', 'Discord rejected the ban request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, interaction.user.id, `[BAN] ${reason}`);

        return interaction.editReply({ embeds: [modActionEmbed({ action: '🔨 User Banned', target, executor: interaction.user, reason, caseid: result.lastInsertRowid })] });
    }
};
