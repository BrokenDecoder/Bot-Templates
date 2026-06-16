const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleinfo',
    slashData: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Shows highly detailed information about a specific role.')
        .addRoleOption(opt => opt.setName('role').setDescription('The role to inspect').setRequired(true)),

    async execute(message, args, client) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ content: '❌ Please mention a valid role.' });
        return handleRoleInfo(role, (embed) => message.reply({ embeds: [embed] }));
    },

    async executeSlash(interaction, client) {
        const role = interaction.options.getRole('role');
        return handleRoleInfo(role, (embed) => interaction.editReply({ embeds: [embed] }));
    }
};

async function handleRoleInfo(role, reply) {
    const permissions = role.permissions.toArray();
    const isAdmin = role.permissions.has('Administrator');
    
    // Group dangerous permissions for highlight
    const dangerousPerms = ['Administrator', 'BanMembers', 'KickMembers', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageWebhooks'];
    const activeDangerous = permissions.filter(p => dangerousPerms.includes(p));

    const embed = new EmbedBuilder()
        .setColor(role.color || 0x2b2d31)
        .setTitle(`🎭 Role: ${role.name}`)
        .setDescription(`─────────────────────────────────\n**Role ID:** \`${role.id}\`\n**Mention:** <@&${role.id}>\n─────────────────────────────────`)
        .addFields(
            { name: '👥 Members with Role', value: `${role.members.size} members`, inline: true },
            { name: '🎨 Hex Color', value: `\`${role.hexColor}\``, inline: true },
            { name: '📅 Created On', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '📌 Hoisted (Displayed Separately)?', value: role.hoist ? '✅ Yes' : '❌ No', inline: true },
            { name: '🔔 Mentionable?', value: role.mentionable ? '✅ Yes' : '❌ No', inline: true },
            { name: '🤖 Managed by Bot/Integration?', value: role.managed ? '✅ Yes' : '❌ No', inline: true }
        );

    if (isAdmin) {
        embed.addFields({ name: '⚠️ Security Warning', value: 'This role has the **Administrator** permission. Users with this role bypass all channel permissions and Anti-Nuke protections.', inline: false });
    } else if (activeDangerous.length > 0) {
        embed.addFields({ name: '🛡️ Dangerous Permissions', value: `\`${activeDangerous.join(', ')}\``, inline: false });
    }

    embed.setTimestamp().setFooter({ text: 'VaultX Information System' });

    return reply(embed);
}
