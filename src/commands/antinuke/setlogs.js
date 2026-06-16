const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'setlogs',
    slashData: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Set the channel for Anti-Nuke security logs.')
        .addChannelOption(opt => opt.setName('channel').setDescription('The text channel to send logs to').setRequired(true)),

    async execute(message, args, client) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [errorEmbed('Access Denied', 'Only the **Server Owner** can configure security logs.')] });
        }
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.setlogs #channel`')] });

        db.prepare('INSERT OR REPLACE INTO guild_config (guildId, logChannelId) VALUES (?, ?)').run(message.guild.id, channel.id);
        return message.reply({ embeds: [successEmbed('Security Logs Configured', `All Anti-Nuke alerts will now be sent to ${channel}.`)] });
    },

    async executeSlash(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'Only the **Server Owner** can configure security logs.')] });
        }
        const channel = interaction.options.getChannel('channel');
        db.prepare('INSERT OR REPLACE INTO guild_config (guildId, logChannelId) VALUES (?, ?)').run(interaction.guild.id, channel.id);
        return interaction.editReply({ embeds: [successEmbed('Security Logs Configured', `All Anti-Nuke alerts will now be sent to ${channel}.`)] });
    }
};
