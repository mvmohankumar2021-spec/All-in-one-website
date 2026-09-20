(() => {
  const grid = document.querySelector('#productGrid');
  if (!grid) return;
  const emoji = ['👍', '❤️', '😂', '👏', '🔥'];
  const clipart = ['🌟', '🎉', '💡', '🚀', '🙌'];
  let account = null;
  const escape = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const stars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const formatDate = (seconds) => seconds ? new Date(seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  async function api(url, options) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function reviewMarkup(review) {
    const reactionButtons = Object.entries(review.reactions || {}).map(([reaction, total]) => `<button class="review-reaction${review.myReaction === reaction ? ' selected' : ''}" data-review-reaction="${escape(reaction)}" title="React ${escape(reaction)}">${escape(reaction)} <b>${total}</b></button>`).join('');
    const reply = review.reply ? `<div class="vendor-review-reply"><b>Vendor reply</b><p>${escape(review.reply.text)}</p></div>` : '';
    const vendorReply = account?.role === 'Vendor' ? `<button class="review-link" data-open-vendor-reply="${review.id}">${review.reply ? 'Edit reply' : 'Reply as Vendor'}</button><form class="vendor-reply-form" data-vendor-reply="${review.id}" hidden><input maxlength="2000" minlength="2" aria-label="Vendor reply" placeholder="Reply to this review"/><button type="submit" aria-label="Send reply">➤</button></form>` : '';
    const customerTools = account?.role === 'Customer' ? `<div class="review-reaction-tools"><button class="review-link" data-picker="emoji">☺</button><button class="review-link" data-picker="clipart">✦</button><div class="review-reaction-catalogue" hidden></div></div>` : '';
    return `<article class="product-review" data-review-id="${review.id}"><div class="review-top"><b>${escape(review.customerName)}</b><span class="review-stars" aria-label="${review.rating} out of 5 stars">${stars(review.rating)}</span></div><p>${escape(review.text)}</p><small>${formatDate(review.updatedAt || review.createdAt)}</small><div class="review-reaction-row">${reactionButtons}${customerTools}</div>${reply}${vendorReply}</article>`;
  }

  function composerMarkup(eligible) {
    if (account?.role !== 'Customer') return '<small>Sign in as a Customer to write a review or react to one.</small>';
    if (!eligible) return '<small class="review-eligibility-note">Available after your verified purchase or completed service.</small>';
    return `<form class="write-review"><label>Your rating <select aria-label="Your rating out of 5" required><option value="">Choose rating out of 5</option><option value="5">5 / 5 · ★★★★★ · Excellent</option><option value="4">4 / 5 · ★★★★ · Very good</option><option value="3">3 / 5 · ★★★ · Good</option><option value="2">2 / 5 · ★★ · Fair</option><option value="1">1 / 5 · ★ · Poor</option></select></label><label><textarea maxlength="2000" minlength="2" required placeholder="Share your experience"></textarea></label><button type="submit">Post review</button></form>`;
  }

  function breakdownMarkup(summary) {
    const total = summary.count || 0;
    return `<div class="review-breakdown" aria-label="Rating breakdown out of 5"><b>${total} rating provider${total === 1 ? '' : 's'}</b>${[5, 4, 3, 2, 1].map((rating) => { const count = Number(summary.distribution?.[rating] || 0); const width = total ? Math.round(count / total * 100) : 0; return `<div class="review-bar"><span class="review-bar-stars" aria-label="${rating} out of 5 stars">${stars(rating)}</span><i><em style="width:${width}%"></em></i><b>${count}</b></div>`; }).join('')}</div>`;
  }

  async function loadReviews(section) {
    const productId = section.closest('[data-product-id]')?.dataset.productId;
    if (!productId) return;
    section.querySelector('.product-review-list').innerHTML = '<small>Loading reviews…</small>';
    try {
      const data = await api(`/api/product-reviews?productId=${encodeURIComponent(productId)}`);
      section.querySelector('.review-summary').innerHTML = data.summary.count ? `<span class="review-stars">${stars(Math.round(data.summary.average))}</span> ${data.summary.average}/5 · ${data.summary.count} review${data.summary.count === 1 ? '' : 's'}` : 'No reviews yet';
      section.querySelector('.review-composer').innerHTML = composerMarkup(data.eligibleToReview);
      section.querySelector('.review-breakdown-wrap').innerHTML = breakdownMarkup(data.summary);
      section.querySelector('.product-review-list').innerHTML = data.reviews.map(reviewMarkup).join('') || '<small>Be the first Customer to review this listing.</small>';
    } catch (error) { section.querySelector('.product-review-list').innerHTML = `<small>${escape(error.message)}</small>`; }
  }

  function addReviewPanel(card) {
    if (card.querySelector('.product-reviews')) return;
    const section = document.createElement('section');
    section.className = 'product-reviews';
    section.innerHTML = `<button class="review-toggle" type="button">★ Ratings & reviews <span class="review-summary">View</span></button><div class="product-review-body" hidden><div class="review-composer">${composerMarkup(false)}</div><div class="review-breakdown-wrap"></div><div class="product-review-list"></div></div>`;
    const price = card.querySelector('.product-info > span');
    if (price) {
      const priceColumn = document.createElement('div');
      priceColumn.className = 'product-price-column';
      price.replaceWith(priceColumn);
      priceColumn.append(price, section);
      section.classList.add('product-reviews--price');
      const toggle = section.querySelector('.review-toggle');
      toggle.setAttribute('aria-label', 'Ratings and reviews');
      toggle.innerHTML = `★ Ratings <span class="review-summary">View</span>`;
    } else {
      card.append(section);
    }
  }

  function hydrate() { grid.querySelectorAll('[data-product-id]').forEach(addReviewPanel); }
  new MutationObserver(hydrate).observe(grid, { childList: true, subtree: true });
  api('/api/session', { method: 'GET' }).then((data) => { account = data.authenticated ? data.account : null; hydrate(); }).catch(hydrate);
  hydrate();

  grid.addEventListener('click', async (event) => {
    const toggle = event.target.closest('.review-toggle');
    if (toggle) { const section = toggle.closest('.product-reviews'); const body = section.querySelector('.product-review-body'); body.hidden = !body.hidden; if (!body.hidden) await loadReviews(section); return; }
    const picker = event.target.closest('[data-picker]');
    if (picker) { const tools = picker.closest('.review-reaction-tools'); const catalogue = tools.querySelector('.review-reaction-catalogue'); const reactions = picker.dataset.picker === 'emoji' ? emoji : clipart; catalogue.hidden = !catalogue.hidden; catalogue.innerHTML = reactions.map((reaction) => `<button type="button" data-review-reaction="${reaction}" title="React ${reaction}">${reaction}</button>`).join(''); return; }
    const reaction = event.target.closest('[data-review-reaction]');
    if (reaction) { const section = reaction.closest('.product-reviews'); try { await api('/api/product-reviews/reaction', { method: 'POST', body: JSON.stringify({ reviewId: Number(reaction.closest('[data-review-id]')?.dataset.reviewId), reaction: reaction.dataset.reviewReaction }) }); await loadReviews(section); } catch (error) { window.alert(error.message); } return; }
    const reply = event.target.closest('[data-open-vendor-reply]');
    if (reply) reply.closest('.product-review').querySelector('.vendor-reply-form').hidden = false;
  });

  grid.addEventListener('submit', async (event) => {
    const write = event.target.closest('.write-review');
    if (write) { event.preventDefault(); const section = write.closest('.product-reviews'); const productId = Number(section.closest('[data-product-id]').dataset.productId); try { await api('/api/product-reviews', { method: 'POST', body: JSON.stringify({ productId, rating: Number(write.querySelector('select').value), text: write.querySelector('textarea').value }) }); write.reset(); await loadReviews(section); } catch (error) { window.alert(error.message); } return; }
    const reply = event.target.closest('.vendor-reply-form');
    if (reply) { event.preventDefault(); const section = reply.closest('.product-reviews'); try { await api('/api/product-reviews/reply', { method: 'POST', body: JSON.stringify({ reviewId: Number(reply.dataset.vendorReply), text: reply.querySelector('input').value }) }); await loadReviews(section); } catch (error) { window.alert(error.message); } }
  });
})();
