const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('media.js', 'utf8');
const code = source.slice(source.indexOf('function classifyMediaPost('), source.indexOf('const mediaFeed ='));
const context = {};
vm.createContext(context);
vm.runInContext(code, context);
for (const aspect of ['9:16', '16:9']) {
  let portrait;
  context.classifyMediaPost({dataset: {aspectRatio: aspect}, classList: {toggle(_, value) {portrait = value;}}, querySelectorAll() {throw Error('Saved selection must take priority over dimensions');}});
  assert.equal(portrait, aspect === '9:16');
}
console.log('Saved portrait and landscape selections override natural media dimensions.');
