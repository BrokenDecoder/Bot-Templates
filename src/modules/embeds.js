const { EmbedBuilder } = require('discord.js');

// Premium Brand Colors (0x2b2d31 matches Discord's dark theme for a "none" look)
const colors = {
    success: 0x2b2d31,
    error: 0x2b2d31,
    warning: 0x2b2d31,
    info: 0x2b2d31,
    security: 0x2b2d31,
    nuke: 0x2b2d31,
    voice: 0x2b2d31,
    mod: 0x2b2d31,
    log: 0x2b2d31
};

module.exports = {
    /** ✅ Success */
    successEmbed: (title, description, footer = null) => {
        const e = new EmbedBuilder()
            .setColor(colors.success)
            .setAuthor({ name: `✅ | ${title}` })
            .setDescription(`> ${description.split('\n').join('\n> ')}`)
            .setTimestamp();
        if (footer) e.setFooter({ text: footer });
        return e;
    },

    /** ❌ Error */
    errorEmbed: (title, description, footer = null) => {
        const e = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: `❌ | ${title}` })
            .setDescription(`> ${description.split('\n').join('\n> ')}`)
            .setTimestamp();
        if (footer) e.setFooter({ text: footer });
        return e;
    },

    /** ⚠️ Warning */
    warningEmbed: (title, description) => {
        return new EmbedBuilder()
            .setColor(colors.warning)
            .setAuthor({ name: `⚠️ | ${title}` })
            .setDescription(`> ${description.split('\n').join('\n> ')}`)
            .setTimestamp();
    },

    /** 🛡️ Anti-Nuke Security Alert */
    nukeAlertEmbed: ({ action, target, executor, status, reason, autoAction, recovered }) => {
        return new EmbedBuilder()
            .setColor(colors.nuke)
            .setAuthor({ name: `🚨 | ANTI-NUKE TRIGGERED` })
            .setDescription(`**Action Detected:**\n\`\`\`\n${action}\n\`\`\``)
            .addFields(
                { name: '👤 Threat Actor', value: executor ? `<@${executor.id}>\n\`${executor.tag}\`\n\`ID: ${executor.id}\`` : '`Automated / Unknown`', inline: true },
                { name: '🎯 Target', value: target || '`Unknown`', inline: true },
                { name: '⚡ Auto-Action Taken', value: `\`${autoAction || 'None'}\``, inline: true },
                { name: '🔁 Auto-Recovery', value: recovered ? '✅ `Success`' : '❌ `Failed / N/A`', inline: true },
                { name: '📋 Status', value: `\`${status}\``, inline: true },
                { name: '📝 Reason', value: reason || 'Anti-Nuke Threshold Exceeded', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: '🛡️ VaultX Anti-Nuke System' });
    },

    /** 📋 Moderation Action */
    modActionEmbed: ({ action, target, executor, reason, caseid, duration }) => {
        const fields = [
            { name: '👤 User', value: `<@${target.id}>\n\`${target.tag}\`\n\`${target.id}\``, inline: true },
            { name: '🔨 Moderator', value: `<@${executor.id}>\n\`${executor.tag}\``, inline: true },
            { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
        ];
        if (caseid) fields.push({ name: '🗂️ Case ID', value: `\`#${caseid}\``, inline: true });
        if (duration) fields.push({ name: '⏳ Duration', value: `\`${duration}\``, inline: true });

        return new EmbedBuilder()
            .setColor(colors.mod)
            .setAuthor({ name: `🔨 | ${action}` })
            .addFields(fields)
            .setThumbnail(target.displayAvatarURL?.({ dynamic: true }) || null)
            .setTimestamp()
            .setFooter({ text: 'VaultX Moderation' });
    },

    /** 📣 DM Notification to the punished user */
    dmPunishEmbed: ({ action, reason, guildName }) => {
        return new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: `🔔 | You have been ${action}` })
            .setDescription(`You were **${action.toLowerCase()}** from **${guildName}**.\n\n**Reason:** ${reason || 'No reason provided'}\n\n*If you believe this was a mistake, please contact a moderator.*`)
            .setTimestamp();
    },

    /** 👤 User info (for .av, .scan) */
    infoEmbed: (title, description) => {
        return new EmbedBuilder()
            .setColor(colors.info)
            .setAuthor({ name: `ℹ️ | ${title}` })
            .setDescription(`> ${description.split('\n').join('\n> ')}`)
            .setTimestamp();
    }
};
