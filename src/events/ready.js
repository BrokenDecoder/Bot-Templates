const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`[READY] Logged in as ${client.user.tag}`);
        console.log(`[READY] Bot is serving ${client.guilds.cache.size} servers.`);
        
        // Dynamic Roleplay RPC Engine
        const { ActivityType } = require('discord.js');
        // REPLACE THESE WITH YOUR OWN CUSTOM STATUSES!
        const activities = [
            { type: ActivityType.Playing, text: 'Custom Status 1' },
            { type: ActivityType.Watching, text: 'Custom Status 2' },
            { type: ActivityType.Listening, text: 'Custom Status 3' }
        ];

        // Run immediately, then loop every 30 seconds
        const updateRPC = () => {
            if (client.customRpc) {
                client.user.setActivity(client.customRpc.text, { type: client.customRpc.type || ActivityType.Playing });
            } else if (activities.length > 0) {
                const random = activities[Math.floor(Math.random() * activities.length)];
                client.user.setActivity(random.text, { type: random.type });
            }
        };
        updateRPC();
        setInterval(updateRPC, 30000);
        
        // Register Slash Commands globally or to a specific guild
        if (client.slashCommands.length > 0) {
            const guildId = process.env.GUILD_ID;
            if (guildId && guildId !== 'your_test_server_id_here') {
                client.guilds.cache.get(guildId)?.commands.set(client.slashCommands)
                    .then(() => console.log(`[READY] Registered ${client.slashCommands.length} slash commands to guild ${guildId}.`))
                    .catch(e => {
                        console.error('SLASH COMMAND ERROR:', JSON.stringify(e.rawError?.errors, null, 2) || e);
                        // The error usually specifies the index, e.g. "19"
                        const errorKeys = e.rawError?.errors ? Object.keys(e.rawError.errors) : [];
                        for (const key of errorKeys) {
                            if (!isNaN(key)) {
                                console.error(`Command at index ${key} that caused error:`, JSON.stringify(client.slashCommands[key], null, 2));
                            }
                        }
                    });
            } else {
                client.application.commands.set(client.slashCommands)
                    .then(() => console.log(`[READY] Registered ${client.slashCommands.length} global slash commands.`))
                    .catch(e => {
                        console.error('SLASH COMMAND ERROR:', JSON.stringify(e.rawError?.errors, null, 2) || e);
                        const errorKeys = e.rawError?.errors ? Object.keys(e.rawError.errors) : [];
                        for (const key of errorKeys) {
                            if (!isNaN(key)) {
                                console.error(`Command at index ${key} that caused error:`, JSON.stringify(client.slashCommands[key], null, 2));
                            }
                        }
                    });
            }
        }
    },
};
