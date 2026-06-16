const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    name: 'defcon',
    slashData: new SlashCommandBuilder()
        .setName('defcon')
        .setDescription('Toggle DEFCON 1 Panic Mode (Owner Only).')
        .addStringOption(opt => opt.setName('state').setDescription('Turn DEFCON on or off').setRequired(true).addChoices(
            { name: 'Enable (ON)', value: 'on' },
            { name: 'Disable (OFF)', value: 'off' }
        )),

    async execute(message, args) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ **SECURITY BLOCK:** Only the Server Owner can manage DEFCON settings.');
        }

        const state = args[0]?.toLowerCase();
        if (state !== 'on' && state !== 'off') {
            return message.reply('Usage: `v defcon on` or `v defcon off`');
        }

        const isEnabled = state === 'on' ? 1 : 0;
        db.prepare('UPDATE guild_config SET defconEnabled = ? WHERE guildId = ?').run(isEnabled, message.guild.id);

        const embed = new EmbedBuilder()
            .setAuthor({ name: '🚨 DEFCON Status Updated' })
            .setDescription(`DEFCON Panic Mode is now **${state === 'on' ? 'ENABLED' : 'DISABLED'}**.`)
            .setColor(0x2b2d31);

        message.reply({ embeds: [embed] });
    },

    async executeSlash(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.editReply({ content: '❌ **SECURITY BLOCK:** Only the Server Owner can manage DEFCON settings.' });
        }

        const state = interaction.options.getString('state');
        const isEnabled = state === 'on' ? 1 : 0;
        
        db.prepare('UPDATE guild_config SET defconEnabled = ? WHERE guildId = ?').run(isEnabled, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setAuthor({ name: '🚨 DEFCON Status Updated' })
            .setDescription(`DEFCON Panic Mode is now **${state === 'on' ? 'ENABLED' : 'DISABLED'}**.`)
            .setColor(0x2b2d31);

        interaction.editReply({ embeds: [embed] });
    }
};
