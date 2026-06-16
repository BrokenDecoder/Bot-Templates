const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    slashData: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Shows highly detailed information about the server.'),

    async execute(message, args, client) {
        return handleServerInfo(message.guild, (embed) => message.reply({ embeds: [embed] }));
    },

    async executeSlash(interaction, client) {
        return handleServerInfo(interaction.guild, (embed) => interaction.editReply({ embeds: [embed] }));
    }
};

async function handleServerInfo(guild, reply) {
    const owner = await guild.fetchOwner().catch(() => null);
    
    // Fetch all members to get accurate counts (bot vs human)
    await guild.members.fetch().catch(() => {});
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    // Channel stats
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setThumbnail(guild.iconURL({ dynamic: true, size: 4096 }))
        .setDescription(`─────────────────────────────────\n**Server ID:** \`${guild.id}\`\n**Created On:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)\n─────────────────────────────────`)
        .addFields(
            { name: '👑 Ownership', value: `**Owner:** ${owner ? owner.user.tag : 'Unknown'}\n**Owner ID:** \`${guild.ownerId}\``, inline: true },
            { name: '👥 Members', value: `**Total:** ${guild.memberCount}\n**Humans:** ${humans}\n**Bots:** ${bots}`, inline: true },
            { name: '💎 Boost Status', value: `**Tier:** Level ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`, inline: true },
            { name: `📁 Channels (${guild.channels.cache.size})`, value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}`, inline: true },
            { name: `🎭 Roles (${guild.roles.cache.size})`, value: `**Highest Role:** ${guild.roles.highest}\n*(Use \`.roleinfo\` for specific role details)*`, inline: true },
            { name: '🛡️ Security', value: `**Verification:** ${guild.verificationLevel}\n**Explicit Filter:** ${guild.explicitContentFilter}`, inline: true }
        )
        .setImage(guild.bannerURL({ size: 4096 }) || null)
        .setTimestamp()
        .setFooter({ text: 'VaultX Information System' });

    return reply(embed);
}
