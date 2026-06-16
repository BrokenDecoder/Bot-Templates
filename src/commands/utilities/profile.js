const { SlashCommandBuilder, EmbedBuilder, ActivityType, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: 'profile',
    slashData: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Manage the bot\'s identity and RPC (Owner Only).')
        .addSubcommand(sub => sub.setName('rpc').setDescription('Lock the bot to a custom RPC status.').addStringOption(opt => opt.setName('text').setDescription('The status text').setRequired(true)))
        .addSubcommand(sub => sub.setName('avatar').setDescription('Update the bot\'s global avatar (Attach image).'))
        .addSubcommand(sub => sub.setName('localavatar').setDescription('Update the bot\'s avatar for this specific server only (Attach image).'))
        .addSubcommand(sub => sub.setName('banner').setDescription('Update the bot\'s global banner (Attach image).'))
        .addSubcommand(sub => sub.setName('rpc_reset').setDescription('Reset to the rotating roleplay engine.')),

    async execute(message, args, client) {
        if (message.author.id !== message.guild.ownerId && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Only the Server Owner and Administrators can modify the bot\'s core identity.');
        }

        const action = args[0]?.toLowerCase();
        
        if (action === 'rpc') {
            const text = args.slice(1).join(' ');
            if (!text) return message.reply('❌ Please provide the status text.');
            
            client.customRpc = { text, type: ActivityType.Playing };
            client.user.setActivity(client.customRpc.text, { type: client.customRpc.type });
            return message.reply(`✅ RPC Engine paused. Status locked to: \`Playing ${text}\``);
        }

        if (action === 'rpc_reset') {
            client.customRpc = null;
            return message.reply('✅ Custom RPC removed. The Rotating Roleplay Engine has resumed.');
        }

        const attachment = message.attachments.first();
        const url = attachment ? attachment.url : args[1];

        if (['avatar', 'localavatar', 'banner'].includes(action)) {
            if (!url) {
                return message.reply('❌ Please attach an image to your message, or provide a direct image URL.');
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
                return message.reply('❌ **Invalid file type!** Please attach a valid image file (`.png`, `.jpg`, `.gif`, or `.webp`).');
            }
        }

        try {
            if (action === 'avatar') {
                await client.user.setAvatar(url);
                return message.reply('✅ Successfully updated the bot\'s **Global Avatar**.');
            } else if (action === 'localavatar') {
                // fetch the image and convert it to base64
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const contentType = response.headers.get('content-type') || 'image/png';
                const dataUri = `data:${contentType};base64,${base64}`;

                // discord.js doesn't let bots set their own server avatar so we hit the REST API directly
                await client.rest.patch(`/guilds/${message.guild.id}/members/@me`, {
                    body: { avatar: dataUri }
                });
                return message.reply('✅ Successfully updated the **Bot\'s Avatar in this specific server**.');
            } else if (action === 'banner') {
                await client.user.setBanner(url);
                return message.reply('✅ Successfully updated the bot\'s **Global Banner**.');
            }
        } catch (error) {
            logger.error({ err: error }, 'Failed to update profile');
            if (error.code === 50035) {
                return message.reply('❌ **Discord API Rate Limit:** You are changing the profile too fast. Please wait a few minutes before trying again.');
            }
            return message.reply('❌ Failed to update profile. Ensure the image is valid (PNG/JPG/GIF under 10MB).');
        }

        message.reply('Usage:\n`v profile avatar [attach image]`\n`v profile localavatar [attach image]`\n`v profile banner [attach image]`\n`v profile rpc <text>`');
    },

    async executeSlash(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: '❌ Only the Server Owner and Administrators can modify the bot\'s core identity.' });
        }

        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'rpc') {
            const text = interaction.options.getString('text');
            client.customRpc = { text, type: ActivityType.Playing };
            client.user.setActivity(client.customRpc.text, { type: client.customRpc.type });
            return interaction.editReply(`✅ RPC Engine paused. Status locked to: \`Playing ${text}\``);
        }

        if (subcommand === 'rpc_reset') {
            client.customRpc = null;
            return interaction.editReply('✅ Custom RPC removed. The Rotating Roleplay Engine has resumed.');
        }

        // slash commands can't drag and drop images easily, so just politely redirect them to prefix
        return interaction.editReply('⚠️ Due to Discord UI limitations, please use the prefix command to easily drag-and-drop images: `v profile avatar` or `v profile localavatar`.');
    }
};
