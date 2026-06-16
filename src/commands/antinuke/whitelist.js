const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed, warningEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'whitelist',
    slashData: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage the Anti-Nuke whitelist.')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a user to the Anti-Nuke whitelist.')
            .addUserOption(opt => opt.setName('target').setDescription('User to whitelist').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a user from the Anti-Nuke whitelist.')
            .addUserOption(opt => opt.setName('target').setDescription('User to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('Show all whitelisted users.')),

    async execute(message, args, client) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('Access Denied', 'Only the **Server Owner** can manage the Anti-Nuke whitelist.')] });
        }
        const sub = args[0];
        const target = message.mentions.users.first();

        if (sub === 'add') {
            if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.whitelist add @user`')] });
            const check = db.prepare('SELECT * FROM whitelist WHERE userId = ?').get(target.id);
            if (check) return message.reply({ embeds: [warningEmbed('Already Whitelisted', `**${target.tag}** is already on the whitelist.`)] });
            db.prepare('INSERT INTO whitelist (userId, addedBy) VALUES (?, ?)').run(target.id, message.author.id);
            return message.reply({ embeds: [successEmbed('Whitelist Updated', `**${target.tag}** \`(${target.id})\` has been added to the Anti-Nuke whitelist.`)] });
        }
        if (sub === 'remove') {
            if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.whitelist remove @user`')] });
            const check = db.prepare('SELECT * FROM whitelist WHERE userId = ?').get(target.id);
            if (!check) return message.reply({ embeds: [warningEmbed('Not Found', `**${target.tag}** is not on the whitelist.`)] });
            db.prepare('DELETE FROM whitelist WHERE userId = ?').run(target.id);
            return message.reply({ embeds: [successEmbed('Whitelist Updated', `**${target.tag}** has been removed from the Anti-Nuke whitelist.`)] });
        }
        if (sub === 'list') {
            const rows = db.prepare('SELECT * FROM whitelist').all();
            const listStr = rows.length ? rows.map(r => `<@${r.userId}> — Added by <@${r.addedBy}>`).join('\n') : 'No users whitelisted.';
            return message.reply({ embeds: [successEmbed('Anti-Nuke Whitelist', listStr)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.whitelist add/remove/list @user`')] });
    },

    async executeSlash(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'Only the **Server Owner** can manage the Anti-Nuke whitelist.')] });
        }
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target');

        if (sub === 'add') {
            const check = db.prepare('SELECT * FROM whitelist WHERE userId = ?').get(target.id);
            if (check) return interaction.editReply({ embeds: [warningEmbed('Already Whitelisted', `**${target.tag}** is already on the whitelist.`)] });
            db.prepare('INSERT INTO whitelist (userId, addedBy) VALUES (?, ?)').run(target.id, interaction.user.id);
            return interaction.editReply({ embeds: [successEmbed('Whitelist Updated', `**${target.tag}** \`(${target.id})\` has been added to the Anti-Nuke whitelist.`)] });
        }
        if (sub === 'remove') {
            const check = db.prepare('SELECT * FROM whitelist WHERE userId = ?').get(target.id);
            if (!check) return interaction.editReply({ embeds: [warningEmbed('Not Found', `**${target.tag}** is not on the whitelist.`)] });
            db.prepare('DELETE FROM whitelist WHERE userId = ?').run(target.id);
            return interaction.editReply({ embeds: [successEmbed('Whitelist Updated', `**${target.tag}** has been removed from the Anti-Nuke whitelist.`)] });
        }
        if (sub === 'list') {
            const rows = db.prepare('SELECT * FROM whitelist').all();
            const listStr = rows.length ? rows.map(r => `<@${r.userId}> — Added by <@${r.addedBy}>`).join('\n') : 'No users whitelisted.';
            return interaction.editReply({ embeds: [successEmbed('Anti-Nuke Whitelist', listStr)] });
        }
    }
};
