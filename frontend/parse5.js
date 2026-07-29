import fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

// Find all `{` and `}` that are not in strings, comments, or regex.
let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inMultiComment = false;
let lastUnmatched = -1;
let openBraces = [];

for(let i=0; i<code.length; i++) {
   let c = code[i];
   if(inString) {
      if(c === '\\') i++;
      else if(c === stringChar) inString = false;
   } else if (inComment) {
      if(c === '\n') inComment = false;
   } else if (inMultiComment) {
      if(c === '*' && code[i+1] === '/') { inMultiComment = false; i++; }
   } else {
      if(c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; }
      else if(c === '/' && code[i+1] === '/') { inComment = true; i++; }
      else if(c === '/' && code[i+1] === '*') { inMultiComment = true; i++; }
      else if(c === '{') {
         openBraces.push({ pos: i, line: code.substring(0, i).split('\n').length });
      }
      else if(c === '}') {
         if (openBraces.length > 0) openBraces.pop();
      }
   }
}

console.log("Unmatched braces:", openBraces);
