const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../modules/embeds');

// ─── Shared permission check ───────────────────────────────────────────────
function requireVoice(message, member, perm) {
    if (!member?.voice?.channel)
        return 'You must be in a voice channel to use this command.';
    if (perm && !message.member.permissions.has(perm))
        return `You need **${perm}** permission to use this.`;
    return null;
}

// ── Helper ─────────────────────────────────────────────────────────────────
async function fetchVoiceMember(guild, userId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    return member?.voice?.channel ? member : null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  .vcmute — Server-mute a user in VC
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcmute = {
    name: 'vcmute',
    slashData: new SlashCommandBuilder()
        .setName('vcmute')
        .setDescription('Server-mute a user in voice chat.')
        .addUserOption(opt => opt.setName('target').setDescription('User to mute').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('MuteMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Mute Members** permission.')] });

        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.vcmute @user [reason]`')] });

        const member = await fetchVoiceMember(message.guild, target.id);
        if (!member) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not currently in a voice channel.')] });

        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.voice.setMute(true, reason);
        return message.reply({ embeds: [successEmbed('VC Muted', `🔇 **${target.tag}** has been server-muted in <#${member.voice.channelId}>.\n**Reason:** ${reason}`)] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('MuteMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Mute Members** permission.')] });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await fetchVoiceMember(interaction.guild, target.id);
        if (!member) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'That user is not currently in a voice channel.')] });

        await member.voice.setMute(true, reason);
        return interaction.editReply({ embeds: [successEmbed('VC Muted', `🔇 **${target.tag}** has been server-muted.\n**Reason:** ${reason}`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vcunmute — Remove server-mute
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcunmute = {
    name: 'vcunmute',
    slashData: new SlashCommandBuilder()
        .setName('vcunmute')
        .setDescription('Remove server-mute from a user in voice chat.')
        .addUserOption(opt => opt.setName('target').setDescription('User to unmute').setRequired(true)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('MuteMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Mute Members** permission.')] });

        const target = message.mentions.users.first();
        const member = await fetchVoiceMember(message.guild, target?.id);
        if (!member) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not currently in a voice channel.')] });

        await member.voice.setMute(false);
        return message.reply({ embeds: [successEmbed('VC Unmuted', `🔊 **${target.tag}** has been unmuted in voice chat.`)] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('MuteMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Mute Members** permission.')] });

        const target = interaction.options.getUser('target');
        const member = await fetchVoiceMember(interaction.guild, target.id);
        if (!member) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        await member.voice.setMute(false);
        return interaction.editReply({ embeds: [successEmbed('VC Unmuted', `🔊 **${target.tag}** has been unmuted.`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vcdrag — Drag a single user to your VC
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcdrag = {
    name: 'vcdrag',
    slashData: new SlashCommandBuilder()
        .setName('vcdrag')
        .setDescription('Drag a user to your current voice channel.')
        .addUserOption(opt => opt.setName('target').setDescription('User to drag').setRequired(true)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('MoveMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Move Members** permission.')] });

        const myChannel = message.member.voice.channel;
        if (!myChannel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const target = message.mentions.users.first();
        const member = await fetchVoiceMember(message.guild, target?.id);
        if (!member) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        await member.voice.setChannel(myChannel);
        return message.reply({ embeds: [successEmbed('User Dragged', `🔀 **${target.tag}** has been moved to **${myChannel.name}**.`)] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('MoveMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Move Members** permission.')] });

        const myChannel = interaction.member.voice.channel;
        if (!myChannel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const target = interaction.options.getUser('target');
        const member = await fetchVoiceMember(interaction.guild, target.id);
        if (!member) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        await member.voice.setChannel(myChannel);
        return interaction.editReply({ embeds: [successEmbed('User Dragged', `🔀 **${target.tag}** has been moved to **${myChannel.name}**.`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vcdragall — Drag everyone from a specific channel to your VC
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcdragall = {
    name: 'vcdragall',
    slashData: new SlashCommandBuilder()
        .setName('vcdragall')
        .setDescription('Drag all users from a voice channel to your current channel.')
        .addChannelOption(opt => opt.setName('from').setDescription('Source voice channel').setRequired(true)),

    async execute(message, args, client) {
        if (!message.member.permissions.has('MoveMembers'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Move Members** permission.')] });

        const myChannel = message.member.voice.channel;
        if (!myChannel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const sourceChannel = message.mentions.channels.first();
        if (!sourceChannel || !sourceChannel.isVoiceBased())
            return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Mention a valid voice channel.')] });

        const members = sourceChannel.members;
        let moved = 0;
        for (const [, m] of members) {
            await m.voice.setChannel(myChannel).catch(() => {});
            moved++;
        }

        return message.reply({ embeds: [successEmbed('Drag All Complete', `🔀 Moved **${moved}** users from **${sourceChannel.name}** to **${myChannel.name}**.`)] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('MoveMembers'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Move Members** permission.')] });

        const myChannel = interaction.member.voice.channel;
        if (!myChannel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const sourceChannel = interaction.options.getChannel('from');
        if (!sourceChannel?.isVoiceBased()) return interaction.editReply({ embeds: [errorEmbed('Invalid Channel', 'Select a valid voice channel.')] });

        let moved = 0;
        for (const [, m] of sourceChannel.members) {
            await m.voice.setChannel(myChannel).catch(() => {});
            moved++;
        }

        return interaction.editReply({ embeds: [successEmbed('Drag All Complete', `🔀 Moved **${moved}** users from **${sourceChannel.name}** to **${myChannel.name}**.`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vclock — Toggle lock on your current VC (user limit = 1 = locked)
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vclock = {
    name: 'vclock',
    slashData: new SlashCommandBuilder()
        .setName('vclock')
        .setDescription('Lock or unlock your current voice channel.'),

    async execute(message, args, client) {
        if (!message.member.permissions.has('ManageChannels'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Manage Channels** permission.')] });

        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const isLocked = channel.permissionOverwrites.cache.get(message.guild.id)?.deny.has('Connect');

        await channel.permissionOverwrites.edit(message.guild.id, { Connect: isLocked ? null : false });
        return message.reply({ embeds: [successEmbed(isLocked ? 'VC Unlocked 🔓' : 'VC Locked 🔒', `**${channel.name}** is now **${isLocked ? 'unlocked' : 'locked'}**. ${isLocked ? 'Anyone can join.' : 'Only whitelisted members can join.'}`)] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('ManageChannels'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Manage Channels** permission.')] });

        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const isLocked = channel.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has('Connect');
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: isLocked ? null : false });
        return interaction.editReply({ embeds: [successEmbed(isLocked ? 'VC Unlocked 🔓' : 'VC Locked 🔒', `**${channel.name}** is now **${isLocked ? 'unlocked' : 'locked'}**.`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vcinv — Get an invite link to the bot owner's VC
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcinv = {
    name: 'vcinv',
    slashData: new SlashCommandBuilder()
        .setName('vcinv')
        .setDescription('Generate a one-time invite to your current voice channel.'),

    async execute(message, args, client) {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const invite = await channel.createInvite({ maxAge: 300, maxUses: 1, reason: 'VC Invite via bot command' });
        return message.reply({ embeds: [successEmbed('VC Invite Generated', `📨 Here is your invite to **${channel.name}**:\n${invite.url}\n\n*Expires in 5 minutes · Single use*`)] });
    },

    async executeSlash(interaction, client) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const invite = await channel.createInvite({ maxAge: 300, maxUses: 1, reason: 'VC Invite via bot command' });
        return interaction.editReply({ embeds: [successEmbed('VC Invite Generated', `📨 Here is your invite to **${channel.name}**:\n${invite.url}\n\n*Expires in 5 minutes · Single use*`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vcreq — Broadcast a VC join request ping to a text channel
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vcreq = {
    name: 'vcreq',
    slashData: new SlashCommandBuilder()
        .setName('vcreq')
        .setDescription('Send a request for someone to join your voice channel.')
        .addUserOption(opt => opt.setName('target').setDescription('User to request').setRequired(true)),

    async execute(message, args, client) {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.vcreq @user`')] });

        const invite = await channel.createInvite({ maxAge: 120, maxUses: 1, reason: 'VC Request' });
        await message.channel.send({ content: `📢 ${target}, **${message.author.tag}** is requesting you to join their voice channel **${channel.name}**!\n${invite.url}` });
        return message.reply({ embeds: [successEmbed('Request Sent', `📨 VC request sent to **${target.tag}**.`)] });
    },

    async executeSlash(interaction, client) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const target = interaction.options.getUser('target');
        const invite = await channel.createInvite({ maxAge: 120, maxUses: 1, reason: 'VC Request' });
        await interaction.channel.send({ content: `📢 ${target}, **${interaction.user.tag}** is requesting you to join their VC **${channel.name}**!\n${invite.url}` });
        return interaction.editReply({ embeds: [successEmbed('Request Sent', `📨 VC request sent to **${target.tag}**.`)] });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  .vvc — Show info about who's currently in your VC
// ═══════════════════════════════════════════════════════════════════════════
module.exports.vvc = {
    name: 'vvc',
    slashData: new SlashCommandBuilder()
        .setName('vvc')
        .setDescription('Show current members in your voice channel.'),

    async execute(message, args, client) {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const members = channel.members.map(m => `${m.voice.serverMute ? '🔇' : m.voice.selfMute ? '🔕' : '🔊'} ${m.user.tag}`);
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle(`🎙️ Voice Channel: ${channel.name}`)
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n${members.join('\n') || 'No users in channel.'}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .addFields(
                { name: '👥 Total Users', value: `${channel.members.size}`, inline: true },
                { name: '🔒 User Limit', value: channel.userLimit ? `${channel.members.size}/${channel.userLimit}` : 'Unlimited', inline: true },
                { name: '🔊 Bitrate', value: `${channel.bitrate / 1000}kbps`, inline: true }
            )
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    },

    async executeSlash(interaction, client) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply({ embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel first.')] });

        const members = channel.members.map(m => `${m.voice.serverMute ? '🔇' : m.voice.selfMute ? '🔕' : '🔊'} ${m.user.tag}`);
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle(`🎙️ Voice Channel: ${channel.name}`)
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n${members.join('\n') || 'No users.'}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .addFields(
                { name: '👥 Total Users', value: `${channel.members.size}`, inline: true },
                { name: '🔒 User Limit', value: channel.userLimit ? `${channel.members.size}/${channel.userLimit}` : 'Unlimited', inline: true },
                { name: '🔊 Bitrate', value: `${channel.bitrate / 1000}kbps`, inline: true }
            )
            .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
    }
};
