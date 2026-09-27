const assert = require('node:assert/strict');
const fs = require('node:fs');
const dictionary = Object.assign({}, ...['languages','languages-workspaces','languages-public','languages-operations','languages-forms','languages-policies','languages-navigation','languages-legal','languages-guidance','languages-legacy','languages-messages'].map(name=>require(`./${name}.js`)));
for (const [source, translations] of Object.entries(dictionary)) {
  assert(source.trim());
  assert(translations.ta && /[\u0B80-\u0BFF]/u.test(translations.ta), source);
  assert(translations.hi && /[\u0900-\u097F]/u.test(translations.hi), source);
}
for (const label of ['Log in','First name','Choose documents','Department Store','Supplier role']) {
  assert(dictionary[label]?.ta && dictionary[label]?.hi, label);
}
for (const file of ['catering','meal','grocery','fresh-food','household','retail']) {
  const schema = JSON.parse(fs.readFileSync(`${file}-schema.json`,'utf8'));
  const fields = [...schema.sections.flatMap(section=>section.fields), ...Object.values(schema.specific || {}), ...Object.values(schema.waterFields || {})];
  const copy = [...schema.services,...schema.sections.map(section=>section.title),...fields.flatMap(field=>[field[1],field[4]]),...schema.policies.map(policy=>policy[1])];
  for (const source of copy) assert(dictionary[source]?.ta && dictionary[source]?.hi, `${file}: ${source}`);
}
const runtime = fs.readFileSync('localization.js','utf8');
assert(runtime.includes("element.setAttribute('value',element.value)"));
assert(runtime.includes('localStorage.setItem'));
assert(!runtime.includes('fetch('));
console.log(`${Object.keys(dictionary).length} bilingual UI entries checked; no remote translation calls.`);
