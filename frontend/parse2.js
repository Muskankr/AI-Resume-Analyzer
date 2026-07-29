import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

try {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
} catch (e) {
  // Let's truncate at the error and then find the last unclosed JSX element
  const sliced = code.slice(0, e.pos);
  console.log("Error at", e.pos, e.loc);
  
  // We can just regex for tags to see what's open near the end
  let openTags = [];
  let tagRegex = /<\/?([a-zA-Z0-9_.-]+)[^>]*>/g;
  let match;
  while ((match = tagRegex.exec(sliced)) !== null) {
      let full = match[0];
      let tag = match[1];
      if (full.startsWith('</')) {
          if (openTags.length > 0 && openTags[openTags.length - 1].tag === tag) {
              openTags.pop();
          } else if (openTags.length > 0) {
              console.log(`Mismatch at index ${match.index}: expected </${openTags[openTags.length - 1].tag}> but found ${full}`);
              // openTags.pop(); // try popping to recover? 
          }
      } else if (!full.endsWith('/>')) {
          openTags.push({tag: tag, index: match.index, full: full});
      }
  }
  console.log("Currently open tags at error:", openTags.slice(-5));
}
