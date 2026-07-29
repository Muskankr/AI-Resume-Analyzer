import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

try {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
  console.log("Pos:", e.pos, e.loc);
}
