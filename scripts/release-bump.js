const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
    console.error("Error: Please provide a target version (e.g., node scripts/release-bump.js 1.2.0)");
    process.exit(1);
}

// 1. Update package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Successfully bumped package.json version from ${oldVersion} to ${newVersion}`);
