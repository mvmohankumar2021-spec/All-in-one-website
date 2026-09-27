// Run with the bundled Python on PATH or pass PYTHON_EXE. Never reads account data.
const {execFileSync} = require('node:child_process');
const sources = JSON.parse(execFileSync(process.env.PYTHON_EXE || 'python', ['-X','utf8','audit_translations.py'], {encoding:'utf8'}));
const dictionary = Object.assign({}, ...['languages','languages-workspaces','languages-public','languages-operations','languages-forms','languages-policies','languages-navigation','languages-legal','languages-guidance','languages-legacy','languages-messages'].map(name=>require(`./${name}.js`)));
const translate = require('./translation-test-utils.cjs').translator(dictionary);
const exceptions = require('./translation-preserved.cjs');
const unresolved = Object.entries(sources).filter(([key])=>translate(key,'ta')===key || translate(key,'hi')===key);
const missing = Object.fromEntries(unresolved.filter(([key])=>!exceptions[key]));
const preserved = Object.fromEntries(unresolved.filter(([key])=>exceptions[key]).map(([key])=>[key,exceptions[key]]));
console.log(JSON.stringify({audited:Object.keys(sources).length, translated:Object.keys(sources).length-unresolved.length, preserved, missing},null,2));
if (process.argv.includes('--strict') && Object.keys(missing).length) process.exitCode = 1;
