const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    console.log('[HANDLER] Loading Commands...');

    const commandsPath = path.join(__dirname, '../commands');
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
        return;
    }

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const exported = require(filePath);

            // Support multi-export files (e.g. voiceManagement.js exports multiple commands)
            const commands = typeof exported === 'object' && !exported.name
                ? Object.values(exported)
                : [exported];

            for (const command of commands) {
                if (!command?.name) {
                    console.log(`[WARNING] Skipping unnamed export in ${file}`);
                    continue;
                }
                if (!command.execute && !command.executeSlash) {
                    console.log(`[WARNING] ${command.name} in ${file} has no execute function.`);
                    continue;
                }
                command.category = folder;
                client.commands.set(command.name, command);
                if (command.slashData) {
                    client.slashCommands.push(command.slashData.toJSON());
                }
            }
        }
    }
    console.log(`[HANDLER] Successfully loaded ${client.commands.size} commands.`);
};
