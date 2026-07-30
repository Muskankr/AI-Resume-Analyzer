import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

try {
  // Let's just find where the first unbalanced { is by slicing
  // We already know there's an issue.
  // Actually, let's just find the last open JSX block.
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
} catch (e) {
  console.log("Error at", e.pos, e.loc);
  const sliced = code.slice(0, e.pos);
  let depth = 0;
  for(let i=0; i<sliced.length; i++) {
     if(sliced[i] === '{') depth++;
     if(sliced[i] === '}') depth--;
  }
  console.log("Brace depth at error:", depth);
}
