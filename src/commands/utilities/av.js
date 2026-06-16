const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'av',
    slashData: new SlashCommandBuilder()
        .setName('av')
        .setDescription('Show a user\'s avatar in full resolution.')
        .addUserOption(opt => opt.setName('target').setDescription('User to get avatar for').setRequired(false)),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        
        const globalAvatar = target.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });
        
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({ name: `${target.tag}`, iconURL: globalAvatar })
            .setTitle('🖼️ User Avatar')
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n[Global Avatar](${globalAvatar})${serverAvatar && serverAvatar !== globalAvatar ? ` · [Server Avatar](${serverAvatar})` : ''}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .setImage(serverAvatar || globalAvatar)
            .addFields(
                { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });
        
        return message.reply({ embeds: [embed] });
    },

    async executeSlash(interaction, client) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        
        const globalAvatar = target.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });
        
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({ name: `${target.tag}`, iconURL: globalAvatar })
            .setTitle('🖼️ User Avatar')
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n[Global Avatar](${globalAvatar})${serverAvatar && serverAvatar !== globalAvatar ? ` · [Server Avatar](${serverAvatar})` : ''}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .setImage(serverAvatar || globalAvatar)
            .addFields(
                { name: '👤 User', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });
        
        return interaction.editReply({ embeds: [embed] });
    }
};
