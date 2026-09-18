const viewTokenFromHash = new URLSearchParams(window.location.hash.slice(1)).get('adminView'); if (viewTokenFromHash) { sessionStorage.setItem('shakalpaAdminVendorView', viewTokenFromHash); history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); } const adminVendorViewToken = sessionStorage.getItem('shakalpaAdminVendorView'); if (adminVendorViewToken) { const nativeFetch = window.fetch.bind(window); window.fetch = (resource, options = {}) => { const headers = new Headers(options.headers || (resource instanceof Request ? resource.headers : undefined)); headers.set('X-SHAKALPA-Admin-Vendor-View', adminVendorViewToken); return nativeFetch(resource, { ...options, headers }); }; }
const toast = document.querySelector('#toast'); let adminVendorView = false;
const productWorkspace = document.querySelector('#productWorkspace');
const approvalRequired = document.querySelector('#approvalRequired');
const productMoney = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
let vendorProducts = [];
let editingProductId = null;
const productEditStyles = document.createElement('style');
productEditStyles.textContent = '.product-row-actions{display:flex;align-items:center;gap:10px}.edit-product{border:1px solid var(--ink);background:#fff;color:var(--ink);padding:7px 10px;font:700 10px "DM Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase}.edit-product:hover{background:var(--ink);color:#fff}';
document.head.append(productEditStyles);
const productDiscoveryFields = document.createElement('div');
productDiscoveryFields.className = 'name-grid product-discovery-fields';
productDiscoveryFields.innerHTML = '<label>Main category<select id="productCategory" required><option value="">Select category</option></select></label><label>Subcategory<select id="productSubcategory" required disabled><option value="">Select subcategory</option></select></label><label>Service / Product<select id="productType" required disabled><option value="">Select service or product</option></select></label>';
document.querySelector('#productDescription').closest('label').before(productDiscoveryFields);
let taxonomy = []; let taxonomyServices = [];
function renderTaxonomyServices() { const subcategory = document.querySelector('#productSubcategory'); const service = document.querySelector('#productType'); const category = taxonomy.find((item) => item.mainCategory === document.querySelector('#productCategory').value && item.subcategory === subcategory.value); const options = category ? taxonomyServices.filter((item) => item.taxonomyId === category.id) : []; service.disabled = !category; service.innerHTML = `<option value="">Select service or product</option>${options.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}`; }
function renderTaxonomySubcategories() { const category = document.querySelector('#productCategory').value; const subcategory = document.querySelector('#productSubcategory'); const options = taxonomy.filter((item) => item.mainCategory === category); subcategory.disabled = !category; subcategory.innerHTML = `<option value="">Select subcategory</option>${options.map((item) => `<option value="${escapeHtml(item.subcategory)}">${escapeHtml(item.subcategory)}</option>`).join('')}`; renderTaxonomyServices(); }
async function loadTaxonomy() { const response = await fetch('/api/taxonomy', { credentials: 'same-origin' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load categories.'); taxonomy = data.categories; taxonomyServices = data.services || []; const category = document.querySelector('#productCategory'); const mains = [...new Set(taxonomy.map((item) => item.mainCategory))]; category.innerHTML = `<option value="">Select category</option>${mains.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}`; renderTaxonomySubcategories(); }
document.querySelector('#productCategory').addEventListener('change', renderTaxonomySubcategories); document.querySelector('#productSubcategory').addEventListener('change', renderTaxonomyServices);
const productKeywordsField = document.createElement('label');
productKeywordsField.innerHTML = 'Search keywords <small class="optional">Optional · separate with commas</small><input id="productKeywords" maxlength="400" placeholder="For example: non-stick, pan, kitchen essential"/>';
document.querySelector('#productDescription').closest('label').after(productKeywordsField);
const keywordSuggestions = document.createElement('section'); keywordSuggestions.className = 'keyword-suggestions'; keywordSuggestions.hidden = true; keywordSuggestions.innerHTML = '<small>Suggestions from SHAKALPA taxonomy</small><div></div>'; productKeywordsField.after(keywordSuggestions);
function renderKeywordSuggestions() { const selectedCategory = taxonomy.find((item) => item.mainCategory === document.querySelector('#productCategory').value && item.subcategory === document.querySelector('#productSubcategory').value); const selected = taxonomyServices.find((item) => item.name === document.querySelector('#productType').value && item.taxonomyId === selectedCategory?.id); const terms = (selected?.keywords || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10); keywordSuggestions.hidden = !terms.length; keywordSuggestions.querySelector('div').innerHTML = terms.map((term) => `<button type="button" data-keyword-suggestion="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join(''); }
document.querySelector('#productType').addEventListener('change', renderKeywordSuggestions); keywordSuggestions.addEventListener('click', (event) => { const button = event.target.closest('[data-keyword-suggestion]'); if (!button) return; const input = document.querySelector('#productKeywords'); const values = input.value.split(',').map((item) => item.trim()).filter(Boolean); if (!values.some((item) => item.toLocaleLowerCase() === button.dataset.keywordSuggestion.toLocaleLowerCase())) values.push(button.dataset.keywordSuggestion); input.value = values.join(', '); input.focus(); });
const productSpecificationsField = document.createElement('label');
productSpecificationsField.innerHTML = 'Product specifications <small class="optional">Optional</small><textarea id="productSpecifications" maxlength="2000" rows="4" placeholder="For example: Material: stainless steel · Size: 28 cm · Colour: black"></textarea>';
keywordSuggestions.after(productSpecificationsField);
const customerActionsField = document.createElement('fieldset');
customerActionsField.className = 'team-permissions customer-actions';
customerActionsField.innerHTML = '<legend>Customer options</legend><label><input type="checkbox" value="Buy" checked/> Buy now</label><label><input type="checkbox" value="Book"/> Book service</label><label><input type="checkbox" value="Call"/> Call for details</label><label><input type="checkbox" value="Callback"/> Request callback</label><small>Enable only the options appropriate for this listing.</small>';
productSpecificationsField.after(customerActionsField);
const productActionsFetch = window.fetch.bind(window); window.fetch = (resource, options = {}) => { const url = typeof resource === 'string' ? resource : resource.url; if (options.method === 'POST' && (url === '/api/vendor/products' || url === '/api/vendor/products/update') && options.body) { const customerActions = [...document.querySelectorAll('.customer-actions input:checked')].map((input) => input.value); const payload = JSON.parse(options.body); payload.customerActions = customerActions; return productActionsFetch(resource, { ...options, body: JSON.stringify(payload) }); } return productActionsFetch(resource, options); };

function escapeHtml(value) { const node = document.createElement('span'); node.textContent = String(value); return node.innerHTML; }
function toastMessage(message) { toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 2800); }
function dataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('A media file could not be read.')); reader.readAsDataURL(file); }); }

function loadRazorpayCheckout() { return new Promise((resolve, reject) => { if (window.Razorpay) return resolve(); const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Payment checkout could not be loaded.')); document.head.append(script); }); }

async function loadProducts() {
  const response = await fetch('/api/vendor/products', { credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load products.');
  document.querySelector('#productPaymentSummary').textContent = data.productEntryFeePaise ? `Entry fee: ${productMoney.format(data.productEntryFeePaise / 100)} per product · Total payable: ${productMoney.format(data.totalPayablePaise / 100)}` : 'Product entry fee is currently ₹0.';
  vendorProducts = data.products;
  const rows = document.querySelector('#vendorProductRows');
  rows.innerHTML = data.products.map((product) => `<article class="vendor-product-row"><div><strong>${escapeHtml(product.name)}</strong><small>${productMoney.format(product.costPaise / 100)} · Qty ${product.availableQuantity} · ${escapeHtml(product.status)}</small></div><div class="product-row-actions"><span class="published-product">${escapeHtml(product.status)}</span><button class="edit-product" data-product-id="${product.id}">Edit</button></div></article>`).join('') || '<p class="empty-products">No products added yet.</p>';
}

async function payProductEntry(productId) {
  const response = await fetch('/api/vendor/product-payment/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ productId }) });
  const order = await response.json();
  if (!response.ok) throw new Error(order.error || 'Could not start product payment.');
  await loadRazorpayCheckout();
  const checkout = new Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: order.name, description: order.description, order_id: order.orderId, method: { upi: true, card: true, netbanking: true }, theme: { color: '#c6f53b' }, handler: async (payment) => {
    const verify = await fetch('/api/vendor/product-payment/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payment) });
    const result = await verify.json();
    if (!verify.ok) throw new Error(result.error || 'Payment verification failed.');
    toastMessage(result.message); await loadProducts();
  } });
  checkout.open();
}

document.querySelector('#vendorProductRows').addEventListener('click', (event) => { const button = event.target.closest('.edit-product'); if (!button) return; const product = vendorProducts.find((item) => item.id === Number(button.dataset.productId)); if (!product) return; editingProductId = product.id; document.querySelector('#productName').value = product.name; document.querySelector('#productCategory').value = product.category || ''; document.querySelector('#productType').value = product.productType || ''; document.querySelector('#productKeywords').value = product.keywords || ''; document.querySelector('#productSpecifications').value = product.specifications || ''; document.querySelector('#productDescription').value = product.description; document.querySelector('#productCost').value = (product.costPaise / 100).toFixed(2); document.querySelector('#productQuantity').value = product.availableQuantity; document.querySelector('#deliveryCharges').value = (product.deliveryChargesPaise / 100).toFixed(2); document.querySelector('#selfDelivery').value = String(product.selfDelivery); document.querySelector('#taxDetails').value = product.taxDetails || ''; document.querySelector('#productMedia').required = false; document.querySelector('.product-workspace-heading h2').textContent = `Edit ${product.name}`; const submit = document.querySelector('#productForm [type="submit"]'); submit.innerHTML = 'Save changes <span>→</span>'; document.querySelector('#productForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); document.querySelector('#productName').focus(); });
document.querySelector('#logoutButton').addEventListener('click', async () => { await fetch('/api/signout', { method: 'POST', credentials: 'same-origin' }); if (adminVendorView) { sessionStorage.removeItem('shakalpaAdminVendorView'); window.location.href = 'admin.html'; return; } window.location.href = 'index.html'; });
document.querySelector('#productForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.target; const error = document.querySelector('#productError'); error.textContent = '';
  const invalid = [...form.querySelectorAll('input,select,textarea')].find((field) => !field.validity.valid);
  if (invalid) { error.textContent = 'Complete all required product fields.'; invalid.focus(); return; }
  const files = [...document.querySelector('#productMedia').files]; const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
  if ((!editingProductId && !files.length) || files.length > 5 || files.filter((file) => file.type.startsWith('video/')).length > 1 || files.some((file) => !allowed.includes(file.type) || file.size > 8 * 1024 * 1024)) { error.textContent = 'Upload 1–5 valid images or one short video, each below 8 MB.'; return; }
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const customerActions = [...document.querySelectorAll('.customer-actions input:checked')].map((input) => input.value); if (!customerActions.length) throw new Error('Enable at least one customer option.');
    const media = await Promise.all(files.map(dataUrl));
    const response = await fetch(editingProductId ? '/api/vendor/products/update' : '/api/vendor/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ productId: editingProductId, name: document.querySelector('#productName').value, category: document.querySelector('#productCategory').value, productType: document.querySelector('#productType').value, keywords: document.querySelector('#productKeywords').value, specifications: document.querySelector('#productSpecifications').value, description: document.querySelector('#productDescription').value, costPaise: Math.round(Number(document.querySelector('#productCost').value) * 100), taxDetails: document.querySelector('#taxDetails').value, availableQuantity: Number(document.querySelector('#productQuantity').value), deliveryChargesPaise: Math.round(Number(document.querySelector('#deliveryCharges').value) * 100), selfDelivery: document.querySelector('#selfDelivery').value === 'true', media }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save product.');
    form.reset(); editingProductId = null; document.querySelector('#productMedia').required = true; document.querySelector('.product-workspace-heading h2').textContent = 'New product'; button.innerHTML = 'Save product <span>→</span>'; toastMessage(data.message); await loadProducts();
  } catch (requestError) { error.textContent = requestError.message; } finally { button.disabled = false; }
});

(async () => {
  const sessionResponse = await fetch('/api/session', { credentials: 'same-origin' }); const session = await sessionResponse.json();
  if (!session.authenticated || session.account.role !== 'Vendor') { window.location.href = 'index.html'; return; }
  adminVendorView = session.adminView === true; document.querySelector('#vendorName').textContent = [session.account.firstName, session.account.lastName].filter(Boolean).join(' '); if (adminVendorView) document.querySelector('#logoutButton').innerHTML = 'Return to Admin <span>→</span>';
  const profileResponse = await fetch('/api/vendor/profile', { credentials: 'same-origin' }); const profileData = await profileResponse.json();
  if (!profileResponse.ok || profileData.profile?.approvalStatus !== 'Approved') { approvalRequired.hidden = false; return; }
  await loadTaxonomy(); productWorkspace.hidden = false; loadProducts().catch((error) => toastMessage(error.message));
})().catch(() => { window.location.href = 'index.html'; });
