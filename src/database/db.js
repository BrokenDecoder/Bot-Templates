const Database = require('better-sqlite3');
const path = require('path');

// Initialize the local SQLite database
const dbPath = path.join(__dirname, 'custombot.db');
const db = new Database(dbPath);

console.log('[DATABASE] Connected to local SQLite database.');

// Create Tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        adminId TEXT NOT NULL,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whitelist (
        userId TEXT PRIMARY KEY,
        addedBy TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guild_config (
        guildId TEXT PRIMARY KEY,
        logChannelId TEXT,
        jailRoleId TEXT,
        muteRoleId TEXT,
        prefix TEXT DEFAULT '.',
        auditChannelId TEXT,
        defconEnabled INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_tracked_roles (
        guildId TEXT,
        roleId TEXT,
        PRIMARY KEY (guildId, roleId)
    );

    CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        guildId TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT
    );
`);

// default guild row setup
module.exports.initGuild = (guildId) => {
    const exists = db.prepare('SELECT 1 FROM guild_config WHERE guildId = ?').get(guildId);
    if (!exists) {
        db.prepare('INSERT OR IGNORE INTO guild_config (guildId) VALUES (?)').run(guildId);
    }
};

module.exports = db;
