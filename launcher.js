const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n==========================================');
console.log('         VAULT-X BOOT SEQUENCE         ');
console.log('==========================================\n');

// check if they already ran npm i
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
    console.log('[setup] missing node_modules, installing deps...');
    console.log('[setup] this might take a sec...\n');
    
    try {
        // run npm i and pipe output
        execSync('npm install', { stdio: 'inherit' });
        console.log('\n[SETUP] ✅ Dependencies successfully installed!');
    } catch (error) {
        console.error('\n[error] failed to install deps');
        console.error('run "npm install" manually if this keeps failing.');
        process.exit(1);
    }
} else {
    console.log('[setup] deps look good.');
}

console.log('[system] booting engine...\n');

// start the bot
try {
    require('./src/index.js');
} catch (error) {
    console.error('\n[CRITICAL ERROR] Bot engine failed to start.');
    console.error(error);
}
