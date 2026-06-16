const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { modActionEmbed, errorEmbed, dmPunishEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'kick',
    slashData: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server.')
        .addUserOption(opt => opt.setName('target').setDescription('The user to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick').setRequired(false)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('KickMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Kick Members** permission.')] });

        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.kick @user [reason]`')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot kick yourself.')] });

        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return message.reply({ embeds: [errorEmbed('Not Found', 'That user is not in this server.')] });
        if (!member.kickable) return message.reply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot kick this user — they have a higher or equal role.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try { await target.send({ embeds: [dmPunishEmbed({ action: 'Kicked', reason, guildName: message.guild.name })] }); } catch (_) {}

        try {
            await member.kick(reason);
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('API Error', 'Discord rejected the kick request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, message.author.id, `[KICK] ${reason}`);

        return message.reply({ embeds: [modActionEmbed({ action: '👟 User Kicked', target, executor: message.author, reason, caseid: result.lastInsertRowid })] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('KickMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Kick Members** permission.')] });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.editReply({ embeds: [errorEmbed('Not Found', 'That user is not in this server.')] });
        if (!member.kickable) return interaction.editReply({ embeds: [errorEmbed('Hierarchy Error', 'I cannot kick this user — they have a higher or equal role.')] });

        try { await target.send({ embeds: [dmPunishEmbed({ action: 'Kicked', reason, guildName: interaction.guild.name })] }); } catch (_) {}

        try {
            await member.kick(reason);
        } catch (error) {
            return interaction.editReply({ embeds: [errorEmbed('API Error', 'Discord rejected the kick request. Ensure my role is high enough.')] });
        }

        const stmt = db.prepare('INSERT INTO warnings (userId, adminId, reason) VALUES (?, ?, ?)');
        const result = stmt.run(target.id, interaction.user.id, `[KICK] ${reason}`);

        return interaction.editReply({ embeds: [modActionEmbed({ action: '👟 User Kicked', target, executor: interaction.user, reason, caseid: result.lastInsertRowid })] });
    }
};
