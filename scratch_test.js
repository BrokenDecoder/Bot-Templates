const { MessagePayload, Client } = require('discord.js');
const client = new Client({ intents: [] });

try {
    const payload = MessagePayload.create(client, {
        components: [
            { type: 17, components: [] }
        ]
    });
    const resolved = payload.resolveData();
    console.log("Success:", resolved);
} catch (e) {
    console.log("Error:", e.name, e.message);
}
