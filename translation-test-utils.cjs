// Run the actual pure resolver for source audits without a browser or account data.
const fs = require('node:fs');
const vm = require('node:vm');
exports.translator = dictionary => {
  const source = fs.readFileSync('localization.js','utf8');
  const start = source.indexOf('function translate(');
  const end = source.indexOf('  const selector =',start);
  if(start<0 || end<0) throw new Error('Translation resolver not found');
  return vm.runInNewContext(`(${source.slice(start,end).trim()})`,{dictionary,language:'en'},{timeout:1000});
};
