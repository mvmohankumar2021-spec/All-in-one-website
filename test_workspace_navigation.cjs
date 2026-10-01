const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('profile-menu.js', 'utf8');
async function run(role, authenticated = true, fallback = false, pathname = '/index.html') {
  const links = [];
  const target = {prepend(link) {links.push(link);}};
  const header = {querySelector() {return fallback ? null : target;}, prepend: target.prepend};
  const context = {
    location: {pathname},
    document: {
      querySelector(selector) {return selector === 'header' ? header : links[0] || null;},
      querySelectorAll() {return [];},
      createElement() {return {dataset: {}, setAttribute() {}};}
    },
    fetch: async () => ({ok: true, json: async () => ({authenticated, account: {role}})})
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {links, context};
}
(async () => {
  for (const role of ['Vendor', 'Agent', 'Employee', 'Admin']) {
    for (const fallback of [false, true]) {
      const {links, context} = await run(role, true, fallback);
      assert.equal(links.length, 1);
      assert.equal(links[0].href, role.toLowerCase() + '.html');
      assert.equal(links[0].title, 'My workspace');
      assert.match(links[0].innerHTML, /<svg/);
      assert.equal(links[0].className, 'account-workspace-link');
      vm.runInContext(source, context);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(links.length, 1, 'Repeated shared script must not duplicate navigation');
    }
    assert.equal((await run(role, true, false, '/' + role.toLowerCase() + '.html')).links.length, 0,
      'Do not show a redundant link on the corresponding workspace home');
  }
  assert.equal((await run('Vendor', true, false, '/vendor-products.html')).links.length, 1,
    'Keep a return route from workspace subpages');
  assert.equal((await run('Vendor', false)).links.length, 0);
  assert.equal((await run('Customer')).links.length, 0);
  console.log('Workspace navigation: roles, header fallback, signed-out state and deduplication passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
