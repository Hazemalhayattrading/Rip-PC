// Inlines the placeholder drawing into a mock, between <!--case:start--> and <!--case:end-->.
//   node docs/design/tools/embed-case.mjs docs/design/mocks/bench/index.html bench
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [file, variant] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const svg = execFileSync('node', [join(here, 'iso-case.mjs'), variant], { encoding: 'utf8' })
  .replace(/<!-- meta .*? -->\n?/, '');
const html = readFileSync(file, 'utf8');
const re = /<!--case:start-->[\s\S]*?<!--case:end-->/g;
const count = (html.match(re) || []).length;
if (!count) throw new Error('no case markers in ' + file);
writeFileSync(file, html.replace(re, `<!--case:start-->${svg.trim()}<!--case:end-->`));
console.log(`embedded ${variant} drawing into ${file} (${count} place${count > 1 ? 's' : ''})`);
