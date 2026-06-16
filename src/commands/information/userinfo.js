const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    slashData: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Shows highly detailed information about a user.')
        .addUserOption(opt => opt.setName('target').setDescription('The user to inspect').setRequired(false)),

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        return handleUserInfo(message.guild, target, (embed) => message.reply({ embeds: [embed] }));
    },

    async executeSlash(interaction, client) {
        const target = interaction.options.getUser('target') || interaction.user;
        return handleUserInfo(interaction.guild, target, (embed) => interaction.editReply({ embeds: [embed] }));
    }
};

async function handleUserInfo(guild, user, reply) {
    const member = await guild.members.fetch(user.id).catch(() => null);
    
    // Sort roles by position to get highest roles
    let rolesDisplay = 'None';
    let highestRole = 'None';
    if (member) {
        const roles = member.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position);
        highestRole = roles.first() ? roles.first().toString() : 'None';
        rolesDisplay = roles.size > 15 
            ? `${roles.map(r => r.toString()).slice(0, 15).join(', ')} ...and ${roles.size - 15} more` 
            : roles.map(r => r.toString()).join(', ') || 'None';
    }

    const flags = user.flags ? user.flags.toArray().join(', ').replace(/_/g, ' ') : 'None';

    const embed = new EmbedBuilder()
        .setColor(member ? member.displayHexColor : 0x2b2d31)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setDescription(`─────────────────────────────────\n**User ID:** \`${user.id}\`\n**Profile:** <@${user.id}>\n─────────────────────────────────`)
        .addFields(
            { name: '📅 Discord Registration', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: true },
            { name: '📥 Server Join Date', value: member && member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` : 'Not in server', inline: true },
            { name: '🚩 Badges & Flags', value: `\`${flags || 'None'}\``, inline: false }
        );

    if (member) {
        embed.addFields(
            { name: '👑 Highest Role', value: highestRole, inline: true },
            { name: '🎨 Server Nickname', value: member.nickname || 'None', inline: true },
            { name: `🎭 All Roles (${member.roles.cache.size - 1})`, value: rolesDisplay, inline: false }
        );
    }

    embed.setTimestamp().setFooter({ text: 'VaultX Information System' });

    return reply(embed);
}
