const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../modules/embeds');
const logger = require('../../utils/logger');

module.exports = {
    name: 'setavatar',
    slashData: new SlashCommandBuilder()
        .setName('setavatar')
        .setDescription('Update the bot\'s global avatar (Admin/Owner Only).')
        .addAttachmentOption(opt => opt.setName('image').setDescription('The new avatar image').setRequired(true)),

    async execute(message, args, client) {
        // Security check
        if (message.author.id !== message.guild.ownerId && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [errorEmbed()] });
        }

        const attachment = message.attachments.first();
        const url = attachment ? attachment.url : args[0];

        if (!url) {
            return message.reply({ embeds: [errorEmbed()] });
        }

        let isValidImage = false;
        if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
            isValidImage = true;
        } else {
            const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
            const cleanUrl = url.split('?')[0].toLowerCase();
            isValidImage = validExtensions.some(ext => cleanUrl.endsWith(ext));
        }

        if (!isValidImage) {
            return message.reply({ embeds: [errorEmbed()] });
        }

        try {
            await client.user.setAvatar(url);
            return message.reply({ embeds: [successEmbed('Identity Updated', 'Successfully updated the bot\'s **Global Avatar**.', 'Security Identity Engine')] });
        } catch (error) {
            if (logger && logger.error) logger.error({ err: error }, 'Failed to update profile');
            else console.error('Failed to update profile:', error);

            if (error.code === 50035) {
                return message.reply({ embeds: [errorEmbed()] });
            }
            return message.reply({ embeds: [errorEmbed()] });
        }
    },

    async executeSlash(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ embeds: [errorEmbed()] });
        }

        const attachment = interaction.options.getAttachment('image');
        
        if (!attachment || !attachment.contentType.startsWith('image/')) {
            return interaction.editReply({ embeds: [errorEmbed()] });
        }

        try {
            await client.user.setAvatar(attachment.url);
            return interaction.editReply({ embeds: [successEmbed('Identity Updated', 'Successfully updated the bot\'s **Global Avatar**.', 'Security Identity Engine')] });
        } catch (error) {
            if (logger && logger.error) logger.error({ err: error }, 'Failed to update profile');
            else console.error('Failed to update profile:', error);

            if (error.code === 50035) {
                return interaction.editReply({ embeds: [errorEmbed()] });
            }
            return interaction.editReply({ embeds: [errorEmbed()] });
        }
    }
};
