require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./utils/logger');

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        tracesSampleRate: 1.0, 
        profilesSampleRate: 1.0,
    });
    logger.info('[SENTRY] Error tracking initialized.');
} else {
    logger.warn('[SENTRY] No SENTRY_DSN found. Error tracking is disabled.');
}

// Initialize the Discord Client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildWebhooks
    ],
    partials: [Partials.User, Partials.Message, Partials.GuildMember, Partials.ThreadMember, Partials.Channel],
    rest: {
        rejectOnRateLimit: (rateLimitData) => {
            // If the rate limit timeout is more than 5 seconds, reject the promise instead of hanging the bot!
            return rateLimitData.timeToReset > 5000;
        }
    }
});

// Collections
client.commands = new Collection();
client.slashCommands = [];
client.cooldowns = new Collection();
client.prefix = process.env.PREFIX || '.';

// Connect to SQLite Database (must come first so handlers can use db)
const db = require('./database/db');

// Load Handlers
require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

// Load Anti-Nuke Engine
require('./modules/antiNuke')(client);
require('./modules/antiPhishing')(client);
require('./modules/antiRaid')(client);

// Global error handlers — prevents bot crashing from unhandled errors
client.on('error', (error) => {
    logger.error({ err: error }, '[CLIENT ERROR]');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
    if (process.env.SENTRY_DSN) Sentry.captureException(reason);
});
process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception');
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
});

// Login
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_bot_token_here') {
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.log('[ERROR] Please configure DISCORD_TOKEN in the .env file to start the bot.');
}
