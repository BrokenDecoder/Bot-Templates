const { SlashCommandBuilder, EmbedBuilder, version: djsversion } = require('discord.js');
const os = require('os');
const db = require('../../database/db');

module.exports = {
    name: 'botinfo',
    slashData: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Shows live diagnostic and system statistics for the bot.'),

    async execute(message, args, client) {
        return handleBotInfo(client, (embed) => message.reply({ embeds: [embed] }));
    },

    async executeSlash(interaction, client) {
        return handleBotInfo(client, (embed) => interaction.editReply({ embeds: [embed] }));
    }
};

async function handleBotInfo(client, reply) {
    // Uptime calculation
    const days = Math.floor(client.uptime / 86400000);
    const hours = Math.floor(client.uptime / 3600000) % 24;
    const minutes = Math.floor(client.uptime / 60000) % 60;
    
    // RAM usage
    const memory = process.memoryUsage();
    const usedRAM = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    // Database stats
    const totalWarnings = db.prepare('SELECT COUNT(*) as count FROM warnings').get().count;
    const totalWhitelists = db.prepare('SELECT COUNT(*) as count FROM whitelist').get().count;

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: `${client.user.username} Diagnostics`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`─────────────────────────────────\n**VaultX Engine** is running securely with zero-setup SQLite.\n─────────────────────────────────`)
        .addFields(
            { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
            { name: '🛰️ API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
            { name: '💾 Memory Usage', value: `${usedRAM} MB / ${totalRAM} GB`, inline: true },
            { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Cached Users', value: `${client.users.cache.size}`, inline: true },
            { name: '🛡️ Active Defenses', value: `10 Anti-Nuke Modules Active`, inline: true },
            { name: '🗄️ Database Stats', value: `${totalWarnings} Warnings Logged\n${totalWhitelists} Whitelisted Admins`, inline: true },
            { name: '⚙️ Environment', value: `Node.js ${process.version}\nDiscord.js v${djsversion}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'VaultX System Monitor' });

    return reply(embed);
}
