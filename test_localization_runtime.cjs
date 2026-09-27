const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const dictionary = Object.assign({},require('./languages.js'),require('./languages-workspaces.js'));
class Element {
  constructor(tag, text='') { this.tagName=tag.toUpperCase(); this.attrs={}; this.nodes=[]; this.children=[]; this.dataset={}; this.hidden=false; if(text)this.nodes.push({nodeValue:text,parentElement:this}); }
  closest() { return this.excluded ? this : null; }
  hasAttribute(key) { return key in this.attrs; }
  setAttribute(key,value) { this.attrs[key]=value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  get value() { return this.attrs.value ?? this.nodes[0]?.nodeValue ?? ''; }
  set value(value) { this.attrs.value=value; }
  append(...nodes) { this.children.push(...nodes); }
  prepend() {}
  add() {}
  addEventListener() {}
}
const label=new Element('label','First name');
const option=new Element('option','Customer');
// A parent walker sees the option before the option itself is selected.
label.nodes.push(...option.nodes);
const privateLabel=new Element('label','First name'); privateLabel.excluded=true;
const status=new Element('p','First name is required.');
const roots=[label,option,privateLabel,status];
const storage=new Map();
const events=[];
const listeners={};
const document={
  body:new Element('body'),documentElement:{lang:'en'},
  querySelectorAll(selector){ return selector==='option'?[option]:selector.startsWith('button[')?[]:roots; },
  createTreeWalker(element){let index=0; return {nextNode(){return element.nodes[index++] || null;}};},
  createElement(tag){return new Element(tag);},dispatchEvent(event){events.push(event);}
};
const context={document,window:{SHAKALPA_TRANSLATIONS:dictionary,addEventListener(name,handler){listeners[name]=handler;}},
  location:{pathname:'/signup.html'},NodeFilter:{SHOW_TEXT:4},
  localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
  MutationObserver:class {disconnect(){} observe(){}},Option:class {},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},requestAnimationFrame:fn=>fn()};
vm.runInNewContext(fs.readFileSync('localization.js','utf8'),context);
const app=context.window.AppI18n;
app.setLanguage('ta');
assert.equal(label.nodes[0].nodeValue,dictionary['First name'].ta);
assert.equal(app.originalText(label), 'First nameCustomer');
assert.equal(app.originalText(null),'');
assert.equal(option.value,'Customer');
assert.equal(option.nodes[0].nodeValue,dictionary.Customer.ta);
assert.equal(privateLabel.nodes[0].nodeValue,'First name');
assert.match(status.nodes[0].nodeValue,/தேவை/);
app.setLanguage('hi');
assert.equal(option.value,'Customer');
assert.equal(option.nodes[0].nodeValue,dictionary.Customer.hi);
app.setLanguage('en');
assert.equal(option.nodes[0].nodeValue,'Customer');
assert.equal(label.nodes[0].nodeValue,'First name');
assert.equal(status.nodes[0].nodeValue,'First name is required.');
assert.equal(app.t('Unrecognised app copy','ta'),'Unrecognised app copy');
assert.equal(app.t(' First name * ','hi'),` ${dictionary['First name'].hi} * `);
assert.equal(app.t('Help for First name','ta'),`${dictionary['First name'].ta} — உதவி`);
assert.match(app.t('Enter accurate first name for this bakery service.','ta'), /துல்லியமான/);
assert.match(app.t('Enter accurate first name. This information is used to review and activate your service profile.','hi'), /समीक्षा/);
assert.equal(storage.get('shakalpa-language'),'en');
app.setLanguage('invalid'); assert.equal(app.language,'en');
listeners.storage({key:'shakalpa-language',newValue:'hi'});
assert.equal(app.language,'hi');
assert.equal(label.nodes[0].nodeValue,dictionary['First name'].hi);
assert.equal(events.at(-1).type,'languagechange');
assert.equal(events.at(-1).detail.language,'hi');
assert.equal(option.value,'Customer');
listeners.storage({key:'shakalpa-language',newValue:'invalid'});
assert.equal(app.language,'hi');
app.setLanguage('en');
console.log('Runtime: language switching, original restoration, nested option values, excluded content, validation, help and persistence passed.');
