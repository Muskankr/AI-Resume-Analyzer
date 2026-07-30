import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('src/App.tsx', 'utf-8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  console.log("Success");
} catch (e) {
  console.error(e.message);
  console.error(e.loc);
}
