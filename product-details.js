(() => {
  const catalogue = [
    { name: 'Moss ceramic set', type: 'Home / Table', price: 68, currency: 'USD', tag: 'NEW', description: 'A tactile ceramic set designed for unhurried mornings and shared tables.', specifications: 'Hand-finished ceramic\nSet of 4 pieces\nFood-safe glaze' },
    { name: 'Arc table light', type: 'Home / Lighting', price: 124, currency: 'USD', tag: 'BESTSELLER', description: 'A warm, adjustable table light that makes every corner feel considered.', specifications: 'Soft ambient LED\nAdjustable shade\nLow-energy design' },
    { name: 'Solace lounge chair', type: 'Home / Furniture', price: 460, currency: 'USD', tag: '', description: 'A generous lounge chair made for slow afternoons and a good book.', specifications: 'Supportive upholstered seat\nSolid timber frame\nIndoor use' },
    { name: 'Form side table', type: 'Home / Furniture', price: 220, currency: 'USD', tag: 'LIMITED', description: 'A compact side table that brings clarity and utility to a living space.', specifications: 'Powder-coated steel base\nEasy-clean surface\nAssembly included' },
  ];
  const fallbackImages = [
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1600210492486-724fefc67fb8?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1608181831718-c9ffd0ab2e91?auto=format&fit=crop&w=1000&q=85',
  ];
  const root = document.querySelector('#productDetail');
  const key = new URLSearchParams(location.search).get('product') || '0';
  const escapeHtml = value => { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; };
  const money = (amount, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(Number(amount));
  const showProduct = (product, fallbackIndex = 0) => {
    if (!product) {
      root.innerHTML = '<section class="product-detail-empty"><p class="eyebrow">PRODUCT NOT FOUND</p><h1>This item is not available.</h1><p>Please return to the shop to browse the current catalogue.</p><a class="button button-lime" href="index.html#shop">Back to shop <span>→</span></a></section>';
      return;
    }
    const media = product.mediaUrl || product.media || fallbackImages[fallbackIndex] || '';
    const mediaMarkup = media ? (String(media).match(/\.(mp4|webm)(\?.*)?$/i) ? `<video src="${escapeHtml(media)}" controls playsinline></video>` : `<img src="${escapeHtml(media)}" alt="${escapeHtml(product.name)}">`) : '<div class="fallback-art" aria-hidden="true"></div>';
    root.innerHTML = `<a class="product-detail-back" href="index.html#shop">← Back to shop</a><section class="product-detail-layout"><div class="product-detail-media">${mediaMarkup}</div><div class="product-detail-info">${product.tag && product.tag !== 'VENDOR' ? `<span class="product-detail-tag">${escapeHtml(product.tag)}</span>` : ''}<p class="eyebrow">PRODUCT DETAILS</p><h1>${escapeHtml(product.name)}</h1><p class="product-detail-price">${money(product.price, product.currency)}</p><p class="product-detail-type">${escapeHtml(product.type || 'SHAKALPA listing')}</p><p class="product-detail-description">${escapeHtml(product.description || `Discover ${product.name} on SHAKALPA.`)}</p><section class="product-detail-specs"><h2>Specifications</h2><p>${escapeHtml(product.specifications || 'Contact the seller for detailed specifications.')}</p></section>${product.id ? `<section class="detail-reviews" id="detailReviews"><button type="button" class="detail-review-toggle" aria-expanded="false">★ Ratings &amp; reviews <span id="detailReviewSummary">View</span></button><div class="detail-review-body" id="detailReviewBody" hidden></div></section>` : ''}<div class="product-detail-actions"><button class="button button-lime" id="detailAdd">Add to bag <span>→</span></button><a class="button button-dark" href="index.html#shop">Continue shopping <span>→</span></a></div></div></section>`;
    document.querySelector('#detailAdd').addEventListener('click', () => { sessionStorage.setItem('shakalpa-detail-product', JSON.stringify(product)); document.querySelector('#detailAdd').textContent = 'Added to bag ✓'; });
    const reviewToggle = document.querySelector('.detail-review-toggle');
    if (reviewToggle) reviewToggle.addEventListener('click', async () => {
      const reviewBody = document.querySelector('#detailReviewBody');
      const isOpening = reviewBody.hidden;
      reviewBody.hidden = !isOpening;
      reviewToggle.setAttribute('aria-expanded', String(isOpening));
      if (!isOpening || reviewBody.dataset.loaded) return;
      reviewBody.innerHTML = '<small>Loading ratings and reviews…</small>';
      try {
        const response = await fetch(`/api/product-reviews?productId=${encodeURIComponent(product.id)}`, { credentials: 'same-origin' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reviews.');
        const summary = data.summary || { count: 0, average: 0 };
        document.querySelector('#detailReviewSummary').textContent = summary.count ? `${summary.average}/5 · ${summary.count}` : 'No reviews yet';
        reviewBody.innerHTML = data.reviews?.length ? data.reviews.map((review) => `<article><div><b>${escapeHtml(review.customerName)}</b><span>${'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}${'☆'.repeat(Math.max(0, 5 - (Number(review.rating) || 0)))}</span></div><p>${escapeHtml(review.text)}</p></article>`).join('') : '<small>No reviews yet. Be the first to rate this product.</small>';
        reviewBody.dataset.loaded = 'true';
      } catch (error) { reviewBody.innerHTML = `<small>${escapeHtml(error.message)}</small>`; }
    });
  };
  const loadProduct = () => {
    if (key.startsWith('id-')) {
      fetch('/api/products', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : Promise.reject()).then(data => {
        const source = data.products.find(item => Number(item.id) === Number(key.slice(3)));
        showProduct(source && { id: source.id, name: source.name, type: [source.category, source.productType].filter(Boolean).join(' · '), price: source.costPaise / 100, currency: 'INR', tag: 'VENDOR', mediaUrl: source.media?.[0], specifications: source.specifications, description: source.keywords ? `Keywords: ${source.keywords}` : '' });
      }).catch(() => showProduct(null));
    } else {
      const index = Number(key);
      showProduct(Number.isInteger(index) ? catalogue[index] : null, index);
    }
  };
  fetch('/api/session', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : Promise.reject()).then(session => {
    if (!session.authenticated) { window.location.replace(`index.html?product=${encodeURIComponent(key)}#shop`); return; }
    loadProduct();
  }).catch(() => { root.innerHTML = '<section class="product-detail-empty"><p class="eyebrow">SIGN IN REQUIRED</p><h1>Sign in to view this product.</h1><p>Return to the shop to sign in or create an account.</p><a class="button button-lime" href="index.html#shop">Back to shop <span>→</span></a></section>'; });
})();
