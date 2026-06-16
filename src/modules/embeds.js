const { EmbedBuilder } = require('discord.js');

// Brand Colors
const colors = {
    success: 0x43b581,
    error: 0xf04747,
    warning: 0xfaa61a,
    info: 0x5865f2,
    security: 0xc1234f,
    nuke: 0xff2244,
    voice: 0x9b59b6,
    mod: 0xe67e22,
    log: 0x2f3136
};

// Separator line for visual flair
const sep = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

module.exports = {
    /** ✅ Success */
    successEmbed: (title, description, footer = null) => {
        const e = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`<:check:✅> ${title}`)
            .setDescription(`${sep}\n${description}\n${sep}`)
            .setTimestamp();
        if (footer) e.setFooter({ text: footer });
        return e;
    },

    /** ❌ Error */
    errorEmbed: (title, description, footer = null) => {
        const e = new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(`🚫 ${title}`)
            .setDescription(`${sep}\n${description}\n${sep}`)
            .setTimestamp();
        if (footer) e.setFooter({ text: footer });
        return e;
    },

    /** ⚠️ Warning */
    warningEmbed: (title, description) => {
        return new EmbedBuilder()
            .setColor(colors.warning)
            .setTitle(`⚠️ ${title}`)
            .setDescription(`${sep}\n${description}\n${sep}`)
            .setTimestamp();
    },

    /** 🛡️ Anti-Nuke Security Alert (used in logs channel) */
    nukeAlertEmbed: ({ action, target, executor, status, reason, autoAction, recovered }) => {
        return new EmbedBuilder()
            .setColor(colors.nuke)
            .setTitle(`🚨 ANTI-NUKE TRIGGERED`)
            .setDescription(`**${sep}**\n> **${action}**\n**${sep}**`)
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

    /** 📋 Moderation Action (warn, ban, kick) */
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
            .setTitle(`🔨 ${action}`)
            .setDescription(sep)
            .addFields(fields)
            .setThumbnail(target.displayAvatarURL?.({ dynamic: true }) || null)
            .setTimestamp()
            .setFooter({ text: 'VaultX Moderation' });
    },

    /** 📣 DM Notification to the punished user */
    dmPunishEmbed: ({ action, reason, guildName }) => {
        return new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(`🔔 You have been ${action}`)
            .setDescription(`${sep}\nYou were **${action.toLowerCase()}** from **${guildName}**.\n\n**Reason:** ${reason || 'No reason provided'}\n\n*If you believe this was a mistake, please contact a moderator.*\n${sep}`)
            .setTimestamp();
    },

    /** 👤 User info (for .av, .scan) */
    infoEmbed: (title, description) => {
        return new EmbedBuilder()
            .setColor(colors.info)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(`${sep}\n${description}\n${sep}`)
            .setTimestamp();
    }
};
