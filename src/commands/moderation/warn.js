const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, modActionEmbed, dmPunishEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'warn',
    slashData: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a formal warning to a user.')
        .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(false)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission to use this.')] });
        }
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', 'Mention a user: `.warn @user [reason]`')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn yourself.')] });
        if (target.id === client.user.id) return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn the bot.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, message.author.id, reason);

        await message.reply({ embeds: [modActionEmbed({ action: 'User Warned', target, executor: message.author, reason, caseid: result.lastInsertRowid })] });
        try {
            await target.send({ embeds: [dmPunishEmbed({ action: 'Warned', reason, guildName: message.guild.name })] });
        } catch (_) {}
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Moderate Members** permission to use this.')] });
        }
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn yourself.')] });
        if (target.id === client.user.id) return interaction.editReply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn the bot.')] });

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, interaction.user.id, reason);

        await interaction.editReply({ embeds: [modActionEmbed({ action: 'User Warned', target, executor: interaction.user, reason, caseid: result.lastInsertRowid })] });
        try {
            await target.send({ embeds: [dmPunishEmbed({ action: 'Warned', reason, guildName: interaction.guild.name })] });
        } catch (_) {}
    }
};
