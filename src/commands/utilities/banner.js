const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'banner',
    slashData: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Show a user\'s Discord profile banner.')
        .addUserOption(opt => opt.setName('target').setDescription('User to get banner for').setRequired(false)),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        // Must fetch the full user to get banner data
        const user = await client.users.fetch(target.id, { force: true }).catch(() => null);
        if (!user) return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch user data.')] });

        const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });

        if (!bannerURL) {
            const accentColor = user.accentColor ? `#${user.accentColor.toString(16).padStart(6, '0')}` : null;
            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setAuthor({ name: '🖼️ Profile Banner' })
                .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\nThis user has no banner.\n${accentColor ? `Accent Color: \`${accentColor}\`` : ''}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setAuthor({ name: '🖼️ Profile Banner' })
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n[Open Full Resolution](${bannerURL})\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .setImage(bannerURL)
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });
        
        return message.reply({ embeds: [embed] });
    },

    async executeSlash(interaction, client) {
        const target = interaction.options.getUser('target') || interaction.user;
        const user = await client.users.fetch(target.id, { force: true }).catch(() => null);
        if (!user) return interaction.editReply({ embeds: [errorEmbed('Error', 'Could not fetch user data.')] });

        const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });

        if (!bannerURL) {
            const accentColor = user.accentColor ? `#${user.accentColor.toString(16).padStart(6, '0')}` : null;
            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setAuthor({ name: '🖼️ Profile Banner' })
                .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\nThis user has no banner.\n${accentColor ? `Accent Color: \`${accentColor}\`` : ''}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setAuthor({ name: '🖼️ Profile Banner' })
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n[Open Full Resolution](${bannerURL})\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .setImage(bannerURL)
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });
        
        return interaction.editReply({ embeds: [embed] });
    }
};
