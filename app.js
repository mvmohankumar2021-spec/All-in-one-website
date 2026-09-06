const products = [
  { name: 'Moss ceramic set', type: 'Home / Table', price: 68, tag: 'NEW' },
  { name: 'Arc table light', type: 'Home / Lighting', price: 124, tag: 'BESTSELLER' },
  { name: 'Solace lounge chair', type: 'Home / Furniture', price: 460, tag: '' },
  { name: 'Form side table', type: 'Home / Furniture', price: 220, tag: 'LIMITED' }
];
const cart = [];
const mediaNavigationLink = document.createElement('a');
mediaNavigationLink.href = 'media.html';
mediaNavigationLink.textContent = 'Media';
document.querySelector('.site-header nav')?.append(mediaNavigationLink);
const jobsNavigationLink = document.createElement('a');
jobsNavigationLink.href = 'jobs.html';
jobsNavigationLink.textContent = 'Job offers';
document.querySelector('.site-header nav')?.append(jobsNavigationLink);
const productGrid = document.querySelector('#productGrid');
const cartItems = document.querySelector('#cartItems');
const cartCount = document.querySelector('#cartCount');
const cartTotal = document.querySelector('#cartTotal');
const panel = document.querySelector('#cartPanel');
const overlay = document.querySelector('#overlay');
const toast = document.querySelector('#toast');

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value);
  return node.innerHTML;
}
function money(amount, currency = 'USD') { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount); }
function renderProducts() {
  productGrid.innerHTML = products.map((p, i) => { const media = p.mediaUrl ? (p.mediaUrl.endsWith('.mp4') || p.mediaUrl.endsWith('.webm') ? `<video class="customer-product-media" src="${escapeHtml(p.mediaUrl)}" muted playsinline controls></video>` : `<img class="customer-product-media" src="${escapeHtml(p.mediaUrl)}" alt="${escapeHtml(p.name)}"/>`) : ''; return `<article class="product">${media ? `<div class="product-image has-media">${media}</div>` : '<div class="product-image"></div>'}${p.tag ? `<span class="product-tag">${escapeHtml(p.tag)}</span>` : ''}<button class="add-product" data-index="${i}" aria-label="Add ${escapeHtml(p.name)} to bag">+</button><div class="product-info"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.type)}</small></div><span>${money(p.price, p.currency)}</span></div></article>`; }).join('');
}
function renderCart() {
  cartCount.textContent = cart.length;
  if (!cart.length) { cartItems.innerHTML = '<p class="empty-cart">Your bag is ready when you are.</p>'; cartTotal.textContent = '$0.00'; return; }
  cartItems.innerHTML = cart.map((item, index) => `<div class="cart-line"><span>${escapeHtml(item.name)}</span><strong>${money(item.price, item.currency)}</strong><button data-remove="${index}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button></div>`).join('');
  const currencies = new Set(cart.map((item) => item.currency || 'USD'));
  cartTotal.textContent = currencies.size === 1 ? money(cart.reduce((sum, item) => sum + item.price, 0), cart[0].currency) : 'Separate checkout required';
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 2800); }
function openCart() { panel.classList.add('open'); overlay.classList.add('visible'); }
function closeCart() { panel.classList.remove('open'); overlay.classList.remove('visible'); }
renderProducts(); renderCart();
async function loadVendorProductsForCustomers() { const response = await fetch('/api/products', { credentials: 'same-origin' }); const data = await response.json(); if (!response.ok || !Array.isArray(data.products) || !data.products.length) return; const listed = data.products.map((product) => ({ name: product.name, type: `${product.vendorName}${product.selfDelivery ? ' · Self delivery' : ''}`, price: product.costPaise / 100, currency: 'INR', tag: 'VENDOR', mediaUrl: product.media?.[0] || '' })); products.push(...listed); renderProducts(); }
loadVendorProductsForCustomers().catch(() => { /* The public storefront remains available without the API. */ });

productGrid.addEventListener('click', (event) => { const button = event.target.closest('[data-index]'); if (!button) return; const product = products[Number(button.dataset.index)]; cart.push(product); renderCart(); showToast(`${product.name} added to your bag`); });
cartItems.addEventListener('click', (event) => { const button = event.target.closest('[data-remove]'); if (!button) return; cart.splice(Number(button.dataset.remove), 1); renderCart(); });
document.querySelector('#cartButton').addEventListener('click', openCart); document.querySelector('#closeCart').addEventListener('click', closeCart); overlay.addEventListener('click', closeCart);
document.querySelector('#checkoutButton').addEventListener('click', () => { if (!cart.length) return showToast('Add something to your bag first.'); showToast('Secure checkout would redirect to your payment provider.'); });
document.querySelector('.book-now').addEventListener('click', () => showToast('Your slot is held. Continue with your payment provider to confirm.'));

const modal = document.querySelector('#authModal'); const modalTitle = document.querySelector('#modalTitle'); const loginForm = document.querySelector('#loginForm'); const googleRoles = new Set(['Agent', 'Vendor', 'Customer']); let requestedRole = '';
const googleDivider = document.createElement('div'); googleDivider.className = 'auth-divider'; googleDivider.innerHTML = '<span>OR</span>'; const googleLogin = document.createElement('a'); googleLogin.className = 'google-login'; googleLogin.innerHTML = '<span class="google-mark">G</span> Continue with Google'; loginForm.after(googleDivider, googleLogin);
function openLogin(role = '') { requestedRole = role; modalTitle.textContent = role ? `${role} sign in` : 'Welcome back'; const googleAllowed = googleRoles.has(role); googleLogin.hidden = !googleAllowed; googleDivider.hidden = !googleAllowed; if (googleAllowed) googleLogin.href = `/api/auth/google?role=${encodeURIComponent(role)}`; modal.showModal(); document.querySelector('#email').focus(); }
const signInButton = document.querySelector('#signInButton'); const headerActions = document.querySelector('.header-actions'); const signUpButton = document.createElement('a'); signUpButton.href = 'signup.html'; signUpButton.className = 'button button-outline header-signup'; signUpButton.textContent = 'Create account'; headerActions.insertBefore(signUpButton, signInButton); let signedInAccount = null;
const signInMenu = document.createElement('div'); signInMenu.className = 'signin-menu'; signInMenu.innerHTML = '<span>CHOOSE YOUR WORKSPACE</span><button data-login-role="Customer">Customer</button><button data-login-role="Vendor">Vendor</button><button data-login-role="Agent">Agent</button><hr><button data-login-role="Employee">Employee</button><button data-login-role="Admin">Admin</button>'; headerActions.append(signInMenu);
async function syncSession() { try { const response = await fetch('/api/session', { credentials: 'same-origin' }); const result = await response.json(); if (result.authenticated) { signedInAccount = result.account; signInButton.textContent = 'Sign out'; } } catch (_) { /* The static preview works without the server. */ } }
signInButton.addEventListener('click', async () => { if (signedInAccount) { await fetch('/api/signout', { method: 'POST', credentials: 'same-origin' }); signedInAccount = null; signInButton.textContent = 'Sign in'; showToast('You have been signed out.'); return; } signInMenu.classList.toggle('open'); }); signInMenu.addEventListener('click', (event) => { const choice = event.target.closest('[data-login-role]'); if (!choice) return; signInMenu.classList.remove('open'); openLogin(choice.dataset.loginRole); }); document.addEventListener('click', (event) => { if (!headerActions.contains(event.target)) signInMenu.classList.remove('open'); }); document.querySelectorAll('.role-login').forEach(button => button.addEventListener('click', () => openLogin(button.dataset.role))); document.querySelector('.close-modal').addEventListener('click', () => modal.close()); syncSession();
document.querySelector('#loginForm').addEventListener('submit', async (event) => { event.preventDefault(); const email = document.querySelector('#email'); const password = document.querySelector('#password'); const error = document.querySelector('#formError'); const submit = event.target.querySelector('[type="submit"]'); error.textContent = ''; if (!email.validity.valid || !password.validity.valid) { error.textContent = 'Enter a valid email and a password of at least 8 characters.'; return; } submit.disabled = true; submit.textContent = 'Signing in…'; try { const response = await fetch('/api/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email: email.value, password: password.value, role: requestedRole }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not sign in.'); modal.close(); event.target.reset(); signedInAccount = result.account; if (result.account.role === 'Admin') { window.location.href = 'admin.html'; return; } if (result.account.role === 'Employee') { window.location.href = 'employee.html'; return; } if (result.account.role === 'Agent') { window.location.href = 'agent.html'; return; } if (result.account.role === 'Vendor') { window.location.href = 'vendor.html'; return; } signInButton.textContent = 'Sign out'; showToast(`Welcome back, ${result.account.firstName}. ${result.account.role} workspace unlocked.`); } catch (requestError) { error.textContent = requestError.message === 'Failed to fetch' ? 'Start the SHAKALPA server before signing in.' : requestError.message; } finally { submit.disabled = false; submit.innerHTML = 'Sign in securely <span>→</span>'; } });
document.querySelector('#trackOrder').addEventListener('click', () => showToast('Demo tracking opened: courier is 12 minutes away.'));
document.querySelector('#driverPin').addEventListener('click', () => showToast('Courier heading to your delivery zone.'));
let mapZoom = 1;
document.querySelector('#zoomIn').addEventListener('click', () => { mapZoom = Math.min(mapZoom + .1, 1.3); document.querySelector('.tracking-map').style.backgroundSize = `${100 * mapZoom}% ${100 * mapZoom}%,${100 * mapZoom}% ${100 * mapZoom}%,18px 18px`; });
document.querySelector('#zoomOut').addEventListener('click', () => { mapZoom = Math.max(mapZoom - .1, .8); document.querySelector('.tracking-map').style.backgroundSize = `${100 * mapZoom}% ${100 * mapZoom}%,${100 * mapZoom}% ${100 * mapZoom}%,18px 18px`; });
