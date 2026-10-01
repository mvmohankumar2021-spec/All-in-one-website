const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const handlers = source.split(/\r?\n/).filter(line => line.startsWith("document.querySelector('#loginForm').addEventListener('submit'"));
assert.equal(handlers.length, 1, 'Sign-in must have one navigation owner');
async function check(role, expected, options = {}) {
  let handler;
  const error = { textContent: '' };
  const submit = {};
  let reloads = 0;
  const location = { href: '', reload() { reloads++; } };
  const context = {
    document: { querySelector(selector) {
      if (selector === '#loginForm') return { addEventListener(_, fn) { handler = fn; } };
      if (selector === '#formError') return error;
      return { value: 'test-only', validity: { valid: !options.invalid } };
    } },
    window: { location }, modal: { close() {} }, requestedRole: role,
    pendingProductDetails: options.product || '', authReturnPath: options.next || '',
    signedInAccount: null,
    fetch: async () => ({ ok: !options.failed, json: async () => ({ account: { role }, error: 'Invalid credentials' }) })
  };
  vm.runInNewContext(handlers[0], context);
  await handler({ preventDefault() {}, target: { reset() {}, querySelector() { return submit; } } });
  assert.equal(location.href, expected);
  assert.equal(reloads, options.reload ? 1 : 0);
  if (options.failed || options.invalid) assert(error.textContent);
}
(async () => {
  const header = { textContent: 'Log in' }, register = { hidden: false };
  let destination = '';
  const sessionContext = {
    signedInAccount: null, signInButton: header, signUpButton: register,
    signInMenu: { classList: { remove() {} } }, authReturnPath: '', requestedLoginRole: 'Vendor',
    URLSearchParams, window: { location: { search: '', replace(path) { destination = path; } } },
    fetch: async () => ({ ok: true, json: async () => ({ authenticated: true, account: { role: 'Vendor' } }) })
  };
  vm.createContext(sessionContext);
  vm.runInContext(source.slice(source.indexOf('function workspacePath('), source.indexOf("window.addEventListener('pageshow'")), sessionContext);
  await sessionContext.syncSession();
  assert.equal(header.textContent, 'Sign out');
  assert.equal(register.hidden, true);
  assert.equal(destination, 'vendor.html');
  sessionContext.requestedLoginRole = '';
  destination = '';
  await sessionContext.syncSession();
  assert.equal(destination, 'vendor.html', 'Plain home must restore vendor workspace');
  destination = '';
  sessionContext.window.location.hash = '#shop';
  await sessionContext.syncSession();
  assert.equal(destination, '', 'Explicit storefront links remain accessible');
  sessionContext.window.location.hash = '#home';
  await sessionContext.syncSession();
  assert.equal(destination, '', 'Home button must not redirect back to vendor');
  sessionContext.fetch = async () => ({ok:true,json:async()=>({authenticated:false})});
  await sessionContext.syncSession();
  assert.equal(header.textContent, 'Log in');
  assert.equal(register.hidden, false);
  for (const role of ['Vendor', 'Agent', 'Admin', 'Employee']) await check(role, `${role.toLowerCase()}.html`);
  await check('Customer', '', { reload: true });
  await check('Vendor', '/vendor.html#profile', { next: '/vendor.html#profile' });
  await check('Vendor', 'product-details.html?product=1', { product: 'product-details.html?product=1' });
  await check('Vendor', '', { failed: true });
  await check('Vendor', '', { invalid: true });
  console.log('Sign-in redirects: roles, return paths, member refresh and failures passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
