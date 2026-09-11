'use strict';
// Lists every internal route target and external URL referenced in src.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) files.push(p);
  }
})(dir);

const tos = new Set();
const ext = new Set();
const anc = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re1 = /to="(\/[^"]*)"/g;
  let m;
  while ((m = re1.exec(s))) tos.add(m[1]);
  const re2 = /href="(https?:[^"]*)"/g;
  while ((m = re2.exec(s))) ext.add(m[1]);
  const re3 = /href="(#[^"]*)"/g;
  while ((m = re3.exec(s))) anc.add(m[1]);
}
console.log('INTERNAL:', [...tos].sort().join('  '));
console.log('EXTERNAL:', [...ext].sort().join('\n  '));
console.log('ANCHORS:', [...anc].sort().join('  '));
