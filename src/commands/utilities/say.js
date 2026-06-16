const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'say',
    slashData: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a direct message to a user through the bot (Admin Only).')
        .addUserOption(opt => opt.setName('target').setDescription('The user to DM').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('The message to send').setRequired(true)),

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You must be an Administrator to use this command.');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply('❌ Please mention a valid user to DM.');

        // Extract message content by removing the command name and the mention
        const contentArgs = args.slice(1).join(' ');
        if (!contentArgs) return message.reply('❌ Please provide a message to send.');

        return handleSay(targetUser, contentArgs, (replyData) => message.reply(replyData));
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You must be an Administrator to use this command.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('target');
        const contentMessage = interaction.options.getString('message');

        return handleSay(targetUser, contentMessage, (replyData) => interaction.reply({ ...replyData, ephemeral: true }));
    }
};

async function handleSay(targetUser, text, reply) {
    if (targetUser.bot) {
        return reply({ content: '❌ You cannot send DMs to other bots.' });
    }

    try {
        // Send the DM
        await targetUser.send(text);

        // Success Confirmation Embed
        const embed = new EmbedBuilder()
            .setColor(0x57F287) // Green
            .setTitle('✅ Message Sent')
            .setDescription(`Successfully sent a direct message to <@${targetUser.id}>.`)
            .addFields({ name: 'Content Sent:', value: `\`\`\`\n${text}\n\`\`\`` })
            .setFooter({ text: 'VaultX Messaging' })
            .setTimestamp();

        return reply({ embeds: [embed] });
    } catch (error) {
        // This usually happens if the user has DMs disabled or blocked the bot
        const embed = new EmbedBuilder()
            .setColor(0xED4245) // Red
            .setTitle('❌ Delivery Failed')
            .setDescription(`Could not send a DM to <@${targetUser.id}>.\nThey likely have their **Direct Messages disabled** for this server, or they have blocked the bot.`)
            .setFooter({ text: 'VaultX Messaging' })
            .setTimestamp();

        return reply({ embeds: [embed] });
    }
}
