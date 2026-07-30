const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

let openTags = [];
let i = 0;
while (i < lines.length) {
    let line = lines[i];
    let tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        let full = match[0];
        let tag = match[1];
        if (full.startsWith('</')) {
            if (openTags.length > 0 && openTags[openTags.length - 1].tag === tag) {
                openTags.pop();
            } else {
                console.log(`Mismatch at line ${i + 1}: expected </${openTags.length > 0 ? openTags[openTags.length - 1].tag : 'NONE'}> but found ${full}`);
                // openTags.pop();
            }
        } else if (!full.endsWith('/>')) {
            openTags.push({tag: tag, line: i + 1});
        }
    }
    i++;
}
console.log('Unclosed tags:', openTags);
