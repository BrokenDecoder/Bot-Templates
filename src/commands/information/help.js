const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'help',
    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands or info about a specific command.')
        .addStringOption(opt => opt.setName('command').setDescription('Specific command to get help for')),

    async execute(message, args, client) {
        const commandQuery = args[0]?.toLowerCase();
        return handleHelp(message, commandQuery, client, (payload) => message.reply(payload));
    },

    async executeSlash(interaction, client) {
        const commandQuery = interaction.options.getString('command')?.toLowerCase();
        return handleHelp(interaction, commandQuery, client, (payload) => interaction.editReply(payload));
    }
};

async function handleHelp(interactionOrMessage, commandQuery, client, reply) {
    const prefix = client.prefix || 'v ';

    if (commandQuery && commandQuery !== 'all') {
        // Find specific command
        const command = client.commands.get(commandQuery);

        if (!command) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setAuthor({ name: '❌ Command Not Found' })
                .setDescription(`Could not find a command named \`${commandQuery}\`.\nUse \`${prefix}help\` to see a list of all commands.`);
            return reply({ embeds: [errorEmbed] });
        }

        const description = command.slashData 
            ? command.slashData.description 
            : 'No description available.';

        // Build options details if available
        let usageStr = `\`${prefix}${command.name}\``;
        let optionsDetails = '';

        if (command.slashData && command.slashData.options && command.slashData.options.length > 0) {
            command.slashData.options.forEach(opt => {
                const optJSON = opt.toJSON();
                // 1 = Subcommand
                if (optJSON.type === 1) {
                    optionsDetails += `**${optJSON.name}** - ${optJSON.description}\n`;
                } else {
                    const requiredStr = optJSON.required ? '<' : '[';
                    const requiredEndStr = optJSON.required ? '>' : ']';
                    usageStr += ` ${requiredStr}${optJSON.name}${requiredEndStr}`;
                    optionsDetails += `**${optJSON.name}** - ${optJSON.description} ${optJSON.required ? '(Required)' : '(Optional)'}\n`;
                }
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: `Command: ${command.name}` })
            .setDescription(description)
            .addFields(
                { name: 'Category', value: command.category ? command.category.charAt(0).toUpperCase() + command.category.slice(1) : 'Uncategorized', inline: true },
                { name: 'Usage', value: usageStr, inline: false }
            )
            .setFooter({ text: '<> = required, [] = optional' });

        if (optionsDetails) {
            embed.addFields({ name: 'Options / Subcommands', value: optionsDetails, inline: false });
        }

        return reply({ embeds: [embed] });
    }

    // List all commands grouped by category
    const categories = new Map();

    client.commands.forEach((cmd) => {
        const cat = cmd.category || 'uncategorized';
        if (!categories.has(cat)) {
            categories.set(cat, []);
        }
        categories.get(cat).push(`\`${cmd.name}\``);
    });

    const categoryNames = {
        antinuke: '🛡️ Anti-Nuke System',
        moderation: '🔨 Moderation',
        voice: '🎙️ Voice Management',
        utilities: '🛠️ Utilities & Events',
        eventManager: '📅 Event Manager',
        information: 'ℹ️ Information',
        uncategorized: '📦 Other'
    };

    if (commandQuery === 'all') {
        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: 'VaultX Command Directory' })
            .setDescription(`Use \`${prefix}help <command>\` to get detailed info about a specific command.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'VaultX System' });

        categories.forEach((cmds, cat) => {
            const displayName = categoryNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
            embed.addFields({ name: `${displayName} (${cmds.length})`, value: cmds.join(', '), inline: false });
        });

        return reply({ embeds: [embed] });
    }

    // Main Help Menu (no arguments)
    const mainEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: '📖 VaultX — Help Menu' })
        .setDescription(`*Prefix:* \`${prefix}\` • 🔵 *Slash Commands: ON*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n⚙️ **Quick Help**\n• Type \`${prefix}help <command>\` for command details\n• Example: \`${prefix}help kick\` or \`${prefix}help jail\`\n\n📁 **Categories**\nSelect a category below to view commands\n\n• 🛡️ **Anti-Nuke System** — Manage security and server protection\n• 🔨 **Moderation** — Server moderation and member management tools\n• 🎙️ **Voice Management** — Moderate and control voice channels\n• 🛠️ **Utilities & Events** — Get information about users and server events\n• ℹ️ **Information** — Deep insights into server, user, and bot data\n\n💡 **Quick Tips:**\n• Most commands require specific permissions (e.g., Ban Members)\n• Anti-Nuke commands strictly require Server Owner\n• Voice commands require you to be in a Voice Channel`)
        .setFooter({ text: 'VaultX Support' });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('📌 Select a command category...')
        .addOptions(
            { label: 'Anti-Nuke System', description: 'Manage security and server protection', emoji: '🛡️', value: 'antinuke' },
            { label: 'Moderation', description: 'Server moderation and member management tools', emoji: '🔨', value: 'moderation' },
            { label: 'Voice Management', description: 'Moderate and control voice channels', emoji: '🎙️', value: 'voice' },
            { label: 'Utilities & Events', description: 'Get information about users and server events', emoji: '🛠️', value: 'utilities' },
            { label: 'Information', description: 'Deep insights into server, user, and bot data', emoji: 'ℹ️', value: 'information' },
            { label: 'Other', description: 'Other uncategorized commands', emoji: '📦', value: 'uncategorized' }
        );

    const supportButton = new ButtonBuilder()
        .setLabel('Join Support Server / Enquire')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/your-support-server'); // Replace with actual URL

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(supportButton);

    const responseMessage = await reply({ embeds: [mainEmbed], components: [row1, row2] });

    // Interaction Collector
    const authorId = interactionOrMessage.user ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    const filter = i => i.customId === 'help_category_select' && i.user.id === authorId;
    
    // Fallback for getting message object
    const messageToCollect = responseMessage || (interactionOrMessage.fetchReply ? await interactionOrMessage.fetchReply().catch(() => null) : null);
    
    if (!messageToCollect) return;

    const collector = messageToCollect.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 120000 });

    collector.on('collect', async i => {
        const selectedCat = i.values[0];
        const cmds = categories.get(selectedCat) || [];
        const displayName = categoryNames[selectedCat] || selectedCat;

        const catEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: `📁 ${displayName} Commands` })
            .setDescription(cmds.length > 0 ? cmds.join(', ') : 'No commands in this category.')
            .setFooter({ text: `Use ${prefix}help <command> for more info` });

        await i.update({ embeds: [catEmbed], components: [row1, row2] });
    });

    collector.on('end', () => {
        const disabledMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
        messageToCollect.edit({ components: [disabledRow, row2] }).catch(() => {});
    });
}

