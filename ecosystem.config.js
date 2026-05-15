// PM2 ecosystem for PogoSphere — shares database with PogoPoitiers.
const path = require('path');
const PROJECT_DIR = __dirname;

// Shared data directory — points to PogoPoitiers's data folder so both
// sites share the same user accounts, rankings, collections, etc.
const POGO_DATA_DIR = path.resolve(PROJECT_DIR, '..', 'pogopoitiers', 'data');

module.exports = {
    apps: [{
        name: 'pogosphere',
        script: 'node_modules/next/dist/bin/next',
        args: 'start -p 3064',
        cwd: PROJECT_DIR,
        env: {
            NEXTAUTH_URL: 'https://pogosphere.com',
            NODE_ENV: 'production',
            POGO_DATA_DIR,
        }
    }, {
        name: 'pogosphere-watchdog',
        script: 'watchdog.js',
        cwd: PROJECT_DIR,
    }, {
        // PogoSphere Discord bot gateway — keeps the bot's WebSocket alive
        // so it shows as Online (green dot) in the Discord member list.
        // Loads .env.local for DISCORD_BOT_TOKEN via --env-file.
        name: 'pogosphere-bot',
        script: 'pogosphere-bot.js',
        cwd: PROJECT_DIR,
        node_args: '--env-file=.env.local',
        max_memory_restart: '150M',
    }]
};
