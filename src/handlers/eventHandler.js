const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    console.log('[HANDLER] Loading Events...');
    
    const eventsPath = path.join(__dirname, '../events');
    
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
        console.log('[HANDLER] Created events directory.');
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
    
    console.log(`[HANDLER] Successfully loaded ${eventFiles.length} events.`);
};
