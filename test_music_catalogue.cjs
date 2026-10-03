const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tracks = JSON.parse(fs.readFileSync('music-catalogue.json', 'utf8'));
assert.equal(new Set(tracks.map(t => t.id)).size, tracks.length);
for (const track of tracks) {
  assert.equal(track.license, 'CC BY 4.0');
  assert.equal(track.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert(track.languages.length && track.category && track.source.startsWith('https://'));
  assert(fs.statSync('assets/music/' + track.file).size > 1000);
}
const elements = [];
function element(tag) {
  const node = {tag, children:[], value:'', attributes:{}, events:{},
    append(...items) {this.children.push(...items);}, after(){},
    replaceChildren(...items){this.children=items;this.value='';},
    setAttribute(key,value){this.attributes[key]=value;}, removeAttribute(){},
    addEventListener(key,handler){this.events[key]=handler;},
    pause(){},load(){this.loadCount=(this.loadCount||0)+1;},scrollIntoView(){},focus(){}
  }; elements.push(node); return node;
}
const context = {document:{createElement:element,createTextNode:text=>({text}),querySelector:()=>element('anchor')},window:{openShagramMusicEditor(){}},request:async()=>({tracks})};
vm.createContext(context);
const source=fs.readFileSync('media-tools.js','utf8');
vm.runInContext(source.slice(0,source.indexOf('  function modal('))+'})();',context);
setImmediate(()=>{
  const select=elements.find(n=>n.id==='shagramMusic');
  const language=elements.find(n=>n.attributes['aria-label']==='Music language');
  const category=elements.find(n=>n.attributes['aria-label']==='Music category');
  const status=elements.find(n=>n.attributes.role==='status');
  assert.equal(tracks.length,12);
  const editor=elements.find(n=>n.className==='shagram-music-editor');
  assert(!editor.open, 'Music editing starts collapsed');
  assert(editor.children.some(n=>n.className==='shagram-music-picker'));
  assert.equal(select.children.length,tracks.length+1);
  language.value='hi';language.events.change(); assert.equal(select.children.length,7);
  language.value='ta';language.events.change(); assert.equal(select.children.length,1); assert.match(status.textContent,/No verified/);
  language.value='';category.value='Devotional';category.events.change(); assert.equal(select.children.length,3);
  category.value='Karaoke';category.events.change(); assert.equal(select.children.length,2);
  assert.equal(select.children[1].value,'wellerman-karaoke-alexander-nakarada');
  context.window.reuseShagramMusic('chal-abhishek-chaudhary');assert.equal(select.value,'chal-abhishek-chaudhary');assert.equal(category.value,'');
  const preview=elements.find(n=>n.tag==='audio');
  assert.equal(editor.hidden,true,'Duplicate composer music controls stay hidden');
  assert.equal(preview.preload,'metadata');
  assert.equal(preview.src,'/assets/music/chal.mp3');
  assert.equal(preview.loadCount,1);
  select.value='main-kabhi-bhi-abhishek-chaudhary';select.onchange();
  assert.equal(preview.src,'/assets/music/main-kabhi-bhi.mp3');assert.equal(preview.loadCount,2);
  context.window.reuseShagramMusic('chal-abhishek-chaudhary');
  category.value='Devotional';category.events.change();assert.equal(select.value,'chal-abhishek-chaudhary');
  const youtube=elements.find(n=>n.textContent==='Search YouTube');
  const spotify=elements.find(n=>n.textContent==='Search Spotify');
  assert.match(youtube.href,/Chal%20Abhishek%20Chaudhary/);
  for(const link of [youtube,spotify]) {assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');}
  const search=elements.find(n=>n.type==='search');search.value='Tamil devotional & songs';search.events.input();
  assert.equal(youtube.href,'https://www.youtube.com/results?search_query=Tamil%20devotional%20%26%20songs');
  assert.equal(spotify.href,'https://open.spotify.com/search/Tamil%20devotional%20%26%20songs');
  assert.equal(select.value,'chal-abhishek-chaudhary');
  context.window.resetShagramMusic(); assert.equal(editor.open,false); assert.equal(select.value,'');
  console.log('12 licensed audio files; Hindi, Tamil-empty, devotional, karaoke filters and reuse/selection preservation passed.');
});
