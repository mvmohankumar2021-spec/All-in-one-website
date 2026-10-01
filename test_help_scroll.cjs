const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('field-help.js', 'utf8');
const start = source.indexOf('  const scrollingHelpCards =');
const end = source.indexOf("  document.addEventListener('click'", start);
assert(start >= 0 && end > start);
for (const language of ['en', 'ta', 'hi']) {
  const cards = ['Help text', 'உதவி உரை', 'सहायता पाठ'].map(textContent => ({textContent, hidden: false}));
  const button = {expanded: 'true', matches: () => true, setAttribute(_, value) {this.expanded = value;}};
  const listeners = {};
  let hides = 0;
  vm.runInNewContext(source.slice(start, end), {
    hidePopover() {hides++;},
    document: {
      documentElement: {lang: language},
      querySelectorAll(selector) {return selector.startsWith('button') ? [button] : cards;},
      addEventListener(name, handler, capture) {assert.equal(capture, true); listeners.document = handler;}
    },
    window: {addEventListener(name, handler) {listeners.window = handler;}}
  });
  listeners.document({target: {closest: () => true}});
  assert.equal(hides, 0, 'Allow scrolling within long help content');
  listeners.document({target: {closest: () => null}});
  assert(cards.every(card => card.hidden));
  assert.equal(button.expanded, 'false');
  listeners.window({target: {}});
  assert.equal(hides, 2);
}
console.log('Help scroll dismissal passes for English, Tamil and Hindi, nested panels and window scrolling.');
