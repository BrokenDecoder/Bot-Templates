const { SlashCommandBuilder, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../modules/embeds');

module.exports = {
    name: 'event',
    slashData: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Manage server events.')
        .addSubcommand(sub => sub.setName('create').setDescription('Create a new scheduled server event.')
            .addStringOption(opt => opt.setName('name').setDescription('Event name').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Event description').setRequired(false))
            .addStringOption(opt => opt.setName('location').setDescription('Location (e.g. #channel or "Discord" for voice)').setRequired(false))
            .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (default 60)').setMinValue(10).setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all upcoming server events.'))
        .addSubcommand(sub => sub.setName('cancel').setDescription('Cancel an upcoming event.')
            .addStringOption(opt => opt.setName('name').setDescription('Name of the event to cancel').setRequired(true))),

    async execute(message, args, client) {
        if (!message.member.permissions.has('ManageEvents'))
            return message.reply({ embeds: [errorEmbed('Access Denied', 'You need **Manage Events** permission.')] });

        const sub = args[0];

        if (sub === 'list') return listEvents(message.guild, (embed) => message.reply({ embeds: [embed] }));

        if (sub === 'create') {
            const name = args.slice(1).join(' ');
            if (!name) return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.event create [name]`')] });
            return createEvent(message.guild, message.author, name, 'Event created via bot.', 60, (embed) => message.reply({ embeds: [embed] }));
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', '`.event create [name]` | `.event list`')] });
    },

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has('ManageEvents'))
            return interaction.editReply({ embeds: [errorEmbed('Access Denied', 'You need **Manage Events** permission.')] });

        const sub = interaction.options.getSubcommand();

        if (sub === 'list') return listEvents(interaction.guild, (embed) => interaction.editReply({ embeds: [embed] }));

        if (sub === 'create') {
            const name = interaction.options.getString('name');
            const description = interaction.options.getString('description') || 'A server event';
            const duration = interaction.options.getInteger('duration') || 60;
            return createEvent(interaction.guild, interaction.user, name, description, duration, (embed) => interaction.editReply({ embeds: [embed] }));
        }

        if (sub === 'cancel') {
            const name = interaction.options.getString('name').toLowerCase();
            const events = await interaction.guild.scheduledEvents.fetch();
            const event = events.find(e => e.name.toLowerCase().includes(name));
            if (!event) return interaction.editReply({ embeds: [errorEmbed('Not Found', `No event matching \`${name}\` was found.`)] });

            await event.delete('Cancelled via bot command');
            return interaction.editReply({ embeds: [successEmbed('Event Cancelled', `🗑️ The event **${event.name}** has been cancelled.`)] });
        }
    }
};

async function createEvent(guild, creator, name, description, durationMins, reply) {
    try {
        const startTime = new Date(Date.now() + 5 * 60 * 1000); // starts 5 minutes from now
        const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);

        const event = await guild.scheduledEvents.create({
            name,
            description,
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            entityType: GuildScheduledEventEntityType.External,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityMetadata: { location: guild.name }
        });

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({ name: '📅 Event Created!' })
            .setDescription(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n**${event.name}**\n${description}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .addFields(
                { name: '⏰ Starts', value: `<t:${Math.floor(startTime / 1000)}:R>`, inline: true },
                { name: '⏱️ Duration', value: `${durationMins} minutes`, inline: true },
                { name: '👤 Organized by', value: `${creator.tag}`, inline: true }
            )
            .setTimestamp();
        return reply(embed);
    } catch (e) {
        return reply(errorEmbed('Failed to Create Event', `Error: ${e.message}`));
    }
}

async function listEvents(guild, reply) {
    const events = await guild.scheduledEvents.fetch().catch(() => null);
    if (!events || events.size === 0)
        return reply(errorEmbed('No Events', 'There are no upcoming scheduled events in this server.'));

    const eventList = events.map(e => `📅 **${e.name}** — <t:${Math.floor(e.scheduledStartTimestamp / 1000)}:R> · ${e.userCount || 0} interested`).join('\n');
    return reply(successEmbed('Upcoming Events', eventList));
}
