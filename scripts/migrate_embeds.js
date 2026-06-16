const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, '../src/commands');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(commandsDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace { embeds: [func(...)] } with { components: func(...) }
    // Handles trailing spaces, newlines inside func arguments.
    // We match any function imported from embeds.js:
    const regex = /\{\s*embeds:\s*\[\s*((?:success|error|warning|nukeAlert|modAction|dmPunish|info)Embed\([\s\S]*?\))\s*\]\s*\}/g;
    
    const newContent = content.replace(regex, '{ components: $1 }');
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedFiles++;
        console.log(`Updated: ${path.relative(commandsDir, file)}`);
    }
});

console.log(`Done! Modified ${changedFiles} files.`);
