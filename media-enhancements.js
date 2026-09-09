let selectedMediaAspect = '16:9';
let previewUrls = [];
const mediaUploadControl = document.querySelector('.media-upload');
const mediaAspectControls = document.createElement('div');
mediaAspectControls.className = 'media-aspect-controls';
mediaAspectControls.innerHTML = '<button type="button" class="active" data-media-aspect="16:9" aria-label="Landscape format, 16 by 9">16:9</button><button type="button" data-media-aspect="9:16" aria-label="Portrait format, 9 by 16">9:16</button>';
mediaAspectControls.hidden = true;
const mediaPreview = document.createElement('div');
mediaPreview.id = 'mediaPreview';
mediaPreview.className = 'media-preview aspect-16-9';
mediaUploadControl.after(mediaAspectControls, mediaPreview);
mediaUploadControl.setAttribute('aria-label', 'Add post');
mediaUploadControl.title = 'Add post';

function renderMediaPreview() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [...document.querySelector('#mediaFiles').files].map((file) => URL.createObjectURL(file));
  mediaPreview.className = `media-preview aspect-${selectedMediaAspect.replace(':', '-')}`;
  mediaPreview.innerHTML = previewUrls.map((url, index) => { const file = document.querySelector('#mediaFiles').files[index]; return file.type.startsWith('video/') ? `<video controls preload="metadata" src="${url}"></video>` : `<img src="${url}" alt="Media preview ${index + 1}"/>`; }).join('');
}

mediaUploadControl.addEventListener('click', () => { mediaAspectControls.hidden = false; });
document.querySelector('#mediaFiles').addEventListener('change', () => { if (!document.querySelector('#mediaFiles').files.length) mediaAspectControls.hidden = true; renderMediaPreview(); });
mediaAspectControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-media-aspect]');
  if (!button) return;
  selectedMediaAspect = button.dataset.mediaAspect;
  mediaAspectControls.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  renderMediaPreview();
});

const baseMediaRequest = request;
request = async (path, options = {}) => {
  if (path === '/api/media/posts' && options.method === 'POST') {
    const result = await baseMediaRequest(path, { ...options, body: JSON.stringify({ ...JSON.parse(options.body || '{}'), aspectRatio: selectedMediaAspect }) });
    previewUrls.forEach((url) => URL.revokeObjectURL(url)); previewUrls = []; mediaPreview.replaceChildren(); mediaAspectControls.hidden = true;
    return result;
  }
  return baseMediaRequest(path, options);
};

const baseLoadPosts = loadPosts;
loadPosts = async () => {
  await baseLoadPosts();
  const renderedPosts = [...document.querySelectorAll('.media-post')];
  renderedPosts.forEach((element, index) => {
    const post = viewer && document.querySelector('#mediaPosts') ? undefined : undefined;
    element.classList.remove('aspect-16-9', 'aspect-9-16');
  });
  const data = await baseMediaRequest('/api/media/posts');
  if (data.viewer?.role === 'Customer' && !document.querySelector('.media-header [href="saved-posts.html"]')) document.querySelector('.media-header nav')?.insertAdjacentHTML('beforeend', '<a href="saved-posts.html">Saved</a>');
  [...document.querySelectorAll('.media-post')].forEach((element, index) => {
    const post = data.posts[index];
    if (!post) return;
    element.id = `post-${post.id}`;
    element.querySelector('.post-media')?.classList.add(`aspect-${(post.aspectRatio || '16:9').replace(':', '-')}`);
    const likeButton = element.querySelector('.like-button');
    if (likeButton) { likeButton.innerHTML = `<span aria-hidden="true">${post.liked ? '♥' : '♡'}</span><b>${post.likes}</b>`; likeButton.setAttribute('aria-label', `${post.liked ? 'Unlike' : 'Like'} post, ${post.likes} reactions`); likeButton.title = post.liked ? 'Unlike' : 'Like'; }
    const commentButton = element.querySelector('.comment-form button');
    if (commentButton) { commentButton.innerHTML = '<span aria-hidden="true">➤</span>'; commentButton.setAttribute('aria-label', 'Post comment'); commentButton.title = 'Post comment'; commentButton.classList.add('comment-symbol'); }
    const commentForm = element.querySelector('.comment-form');
    if (commentForm) { commentForm.hidden = true; if (!commentForm.querySelector('[data-private-emoji-toggle]')) commentForm.querySelector('button').insertAdjacentHTML('beforebegin', '<span class="private-tools comment-tools"><button type="button" class="private-picker-image emoji-picker-image" data-private-emoji-toggle aria-label="Open emoji catalogue" title="Emoji catalogue">🤩</button><button type="button" class="private-picker-image clip-picker-image" data-private-clip-toggle aria-label="Open clipart catalogue" title="Clipart catalogue">🧸</button></span><span class="private-emoji-catalog" hidden><button type="button" data-private-emoji="😊">😊</button><button type="button" data-private-emoji="👍">👍</button><button type="button" data-private-emoji="❤️">❤️</button><button type="button" data-private-emoji="😂">😂</button><button type="button" data-private-emoji="🎉">🎉</button><button type="button" data-private-emoji="🔥">🔥</button></span><span class="private-emoji-catalog private-clip-catalog" hidden><button type="button" data-private-clip="🛍️">🛍️</button><button type="button" data-private-clip="🎁">🎁</button><button type="button" data-private-clip="📦">📦</button><button type="button" data-private-clip="📞">📞</button><button type="button" data-private-clip="⭐">⭐</button><button type="button" data-private-clip="💬">💬</button></span>'); }
    if (!element.querySelector('[data-comment-toggle]')) element.querySelector('.post-actions')?.insertAdjacentHTML('beforeend', `<button class="comment-post" data-comment-toggle="${post.id}" aria-label="Write a comment" title="Comment"><span aria-hidden="true">◌</span></button>`);
    if (data.viewer && data.viewer.id !== post.accountId && !element.querySelector('[data-direct-message-form]')) element.querySelector('.post-actions')?.insertAdjacentHTML('beforeend', `<form class="private-message-form" data-direct-message-form="${post.id}"><input maxlength="1000" required placeholder="Message owner…" aria-label="Private message to post owner"/><button type="submit" aria-label="Send private message">Send</button></form>`);
    if (!element.querySelector('[data-share-post]')) { const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`; const shareText = `${post.caption || 'See this Shagram post'} ${postUrl}`; element.querySelector('.post-actions')?.insertAdjacentHTML('beforeend', `<span class="post-share"><button class="share-post" data-share-post="${post.id}" aria-label="Share post" title="Share post"><span aria-hidden="true">↗</span></button><span class="post-share-menu" data-share-menu="${post.id}" hidden><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" title="Facebook">f</a><button type="button" data-instagram-share="${post.id}" data-share-text="${escapeHtml(shareText)}" aria-label="Share to Instagram" title="Instagram">◎</button><a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="WhatsApp">◉</a></span></span>`); }
    const actions = element.querySelector('.post-actions');
    if (data.viewer && !element.querySelector('.post-secondary-actions')) actions?.insertAdjacentHTML('beforeend', '<span class="post-secondary-actions"></span>');
    const secondaryActions = element.querySelector('.post-secondary-actions');
    if (data.viewer && !element.querySelector('[data-save-post]')) secondaryActions?.insertAdjacentHTML('beforeend', `<button class="save-post ${post.saved ? 'saved' : ''}" data-save-post="${post.id}" aria-label="${post.saved ? 'Remove saved post' : 'Save post'}" title="${post.saved ? 'Saved' : 'Save post'}"><span aria-hidden="true">▮</span></button>`);
    if (data.viewer && !element.querySelector('[data-report-post]')) secondaryActions?.insertAdjacentHTML('beforeend', `<button class="report-post" data-report-post="${post.id}" aria-label="Report post" title="Report post"><span aria-hidden="true">•••</span></button>`);
    if (data.viewer?.id === post.accountId && !element.querySelector('[data-edit-post]')) secondaryActions?.insertAdjacentHTML('beforebegin', `<button class="edit-post" data-edit-post="${post.id}" aria-label="Edit post" title="Edit post"><span aria-hidden="true">✎</span></button>`);
    const directMessageForm = element.querySelector('[data-direct-message-form]'); const shareControl = element.querySelector('.post-share'); if (shareControl && directMessageForm) shareControl.after(directMessageForm);
  });
  if (data.viewer) renderPrivateInbox(data).catch(() => {});
};

async function renderPrivateInbox(data) { const owned = data.posts.filter((post) => post.accountId === data.viewer.id); if (!owned.length) return; const all = (await Promise.all(owned.map((post) => baseMediaRequest(`/api/media/messages?postId=${post.id}`).then((result) => result.messages.map((message) => ({ ...message, post })) )))).flat(); const received = all.filter((message) => message.recipientId === data.viewer.id); const threads = [...new Map(received.map((message) => [`${message.post.id}-${message.senderId}`, message])).values()].map((item) => ({ ...item, messages: all.filter((message) => message.post.id === item.post.id && ((message.senderId === item.senderId && message.recipientId === data.viewer.id) || (message.senderId === data.viewer.id && message.recipientId === item.senderId))) })); let inbox = document.querySelector('#privateInbox'); if (!inbox) { inbox = document.createElement('aside'); inbox.id = 'privateInbox'; inbox.className = 'private-inbox'; document.body.append(inbox); } inbox.innerHTML = `<button type="button" class="private-inbox-toggle">✉ <b>${threads.length}</b></button><section hidden><strong>Private messages</strong><div>${threads.map((item) => `<div class="inbox-message"><b>${escapeHtml(item.author)}</b>${item.messages.map((message) => `<small class="${message.senderId === data.viewer.id ? 'inbox-sent-message' : ''}"><b>${message.senderId === data.viewer.id ? 'You' : escapeHtml(item.author)}</b> ${escapeHtml(message.body)}</small>`).join('')}<form data-inbox-reply="${item.post.id}" data-recipient-id="${item.senderId}"><input maxlength="1000" required placeholder="Reply privately…"/><span class="private-tools"><button type="button" data-private-emoji-toggle>☺</button><button type="button" data-private-clip-toggle>▣</button></span><button type="submit">Reply</button></form></div>`).join('') || '<small>No new messages</small>'}</div></section>`; inbox.querySelector('.private-inbox-toggle').addEventListener('click', () => { const panel = inbox.querySelector('section'); panel.hidden = !panel.hidden; }); }

const editDialog = document.createElement('dialog');
editDialog.className = 'edit-post-dialog';
editDialog.innerHTML = '<button class="close-edit-post" type="button" aria-label="Close">×</button><p class="eyebrow">EDIT POST</p><h2>Edit your Shagram post</h2><form id="editPostForm"><textarea id="editPostCaption" maxlength="2000" rows="6"></textarea><div class="media-aspect-controls"><button type="button" data-edit-aspect="16:9">16:9</button><button type="button" data-edit-aspect="9:16">9:16</button></div><p class="form-error" id="editPostError" role="alert"></p><button class="button button-lime" type="submit">Save changes <span>→</span></button></form>';
document.body.append(editDialog);
const reportDialog = document.createElement('dialog');
reportDialog.className = 'report-post-dialog';
reportDialog.innerHTML = '<button class="close-report-post" type="button" aria-label="Close">×</button><p class="eyebrow">REPORT POST</p><h2>Help keep Shagram safe</h2><p>Select the reason that best describes this content. Reports are private.</p><form id="reportPostForm"><label>Reason<select id="reportReason" required><option value="">Choose a reason</option><option>Adult or sexual content</option><option>Violence or graphic harm</option><option>Harassment or hate</option><option>Spam or scam</option><option>Other</option></select></label><label>Additional details <small>(optional)</small><textarea id="reportDetails" maxlength="500" rows="3" placeholder="Tell us what happened"></textarea></label><p class="form-error" id="reportPostError" role="alert"></p><button class="button button-dark" type="submit">Submit report <span>→</span></button></form>';
document.body.append(reportDialog);
let editingPost = null;
let reportingPostId = null;
document.querySelector('#mediaPosts').addEventListener('click', (event) => {
  const comment = event.target.closest('[data-comment-toggle]');
  if (comment) { const form = comment.closest('.media-post')?.querySelector('.comment-form'); if (form) { form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input')?.focus(); } return; }
  const share = event.target.closest('[data-share-post]');
  if (share) { const menu = document.querySelector(`[data-share-menu="${share.dataset.sharePost}"]`); document.querySelectorAll('.post-share-menu').forEach((item) => { if (item !== menu) item.hidden = true; }); menu.hidden = !menu.hidden; return; }
  const instagram = event.target.closest('[data-instagram-share]');
  if (instagram) { const text = instagram.dataset.shareText; if (navigator.share) navigator.share({ title: 'Shagram', text, url: `${window.location.origin}${window.location.pathname}#post-${instagram.dataset.instagramShare}` }).catch(() => {}); else navigator.clipboard.writeText(text).then(() => toast('Post link copied. Paste it into Instagram to share.')).catch(() => toast('Copy this page link to share on Instagram.')); return; }
  const save = event.target.closest('[data-save-post]');
  if (save) { baseMediaRequest('/api/media/save', { method: 'POST', body: JSON.stringify({ postId: Number(save.dataset.savePost) }) }).then((data) => { toast(data.saved ? 'Post saved.' : 'Post removed from saved items.'); return loadPosts(); }).catch((error) => toast(error.message)); return; }
  const report = event.target.closest('[data-report-post]');
  if (report) { reportingPostId = Number(report.dataset.reportPost); document.querySelector('#reportPostForm').reset(); document.querySelector('#reportPostError').textContent = ''; reportDialog.showModal(); return; }
  const button = event.target.closest('[data-edit-post]');
  if (!button) return;
  baseMediaRequest('/api/media/posts').then((data) => {
    editingPost = data.posts.find((post) => post.id === Number(button.dataset.editPost));
    if (!editingPost) return;
    document.querySelector('#editPostCaption').value = editingPost.caption;
    editDialog.querySelectorAll('[data-edit-aspect]').forEach((item) => item.classList.toggle('active', item.dataset.editAspect === (editingPost.aspectRatio || '16:9')));
    editDialog.showModal();
  }).catch((error) => toast(error.message));
});
editDialog.querySelector('.close-edit-post').addEventListener('click', () => editDialog.close());
reportDialog.querySelector('.close-report-post').addEventListener('click', () => reportDialog.close());
editDialog.querySelectorAll('[data-edit-aspect]').forEach((button) => button.addEventListener('click', () => editDialog.querySelectorAll('[data-edit-aspect]').forEach((item) => item.classList.toggle('active', item === button))));
document.querySelector('#editPostForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = document.querySelector('#editPostError'); error.textContent = '';
  const aspect = editDialog.querySelector('[data-edit-aspect].active').dataset.editAspect;
  try { await baseMediaRequest('/api/media/posts/update', { method: 'POST', body: JSON.stringify({ postId: editingPost.id, caption: document.querySelector('#editPostCaption').value, aspectRatio: aspect }) }); editDialog.close(); await loadPosts(); } catch (requestError) { error.textContent = requestError.message; }
});
document.querySelector('#reportPostForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = document.querySelector('#reportPostError'); error.textContent = '';
  try { const result = await baseMediaRequest('/api/media/report', { method: 'POST', body: JSON.stringify({ postId: reportingPostId, reason: document.querySelector('#reportReason').value, details: document.querySelector('#reportDetails').value }) }); reportDialog.close(); toast(result.message); } catch (requestError) { error.textContent = requestError.message; }
});
document.addEventListener('submit', (event) => { const form = event.target.closest('[data-direct-message-form], [data-inbox-reply]'); if (!form) return; event.preventDefault(); const input = form.querySelector('input'); const body = input.value.trim(); if (!body) return; const button = form.querySelector('button'); button.disabled = true; const postId = Number(form.dataset.directMessageForm || form.dataset.inboxReply); const recipientId = form.dataset.recipientId ? Number(form.dataset.recipientId) : undefined; request('/api/media/messages', { method: 'POST', body: JSON.stringify({ postId, recipientId, body }) }).then(() => { if (form.dataset.inboxReply) form.insertAdjacentHTML('beforebegin', `<small class="inbox-sent-message"><b>You</b> ${escapeHtml(body)}</small>`); input.value = ''; toastMessage('Private reply sent.'); }).catch((error) => toastMessage(error.message)).finally(() => { button.disabled = false; }); });
document.addEventListener('focusin', (event) => { const form = event.target.closest('[data-direct-message-form], [data-inbox-reply]'); if (form && !form.querySelector('[data-private-emoji-toggle]')) form.querySelector('button').insertAdjacentHTML('beforebegin', '<button type="button" class="private-emoji" data-private-emoji-toggle aria-label="Open emoji catalogue">☺</button><span class="private-emoji-catalog" hidden><button type="button" data-private-emoji="😊">😊</button><button type="button" data-private-emoji="👍">👍</button><button type="button" data-private-emoji="❤️">❤️</button><button type="button" data-private-emoji="😂">😂</button><button type="button" data-private-emoji="🙏">🙏</button><button type="button" data-private-emoji="🎉">🎉</button><button type="button" data-private-emoji="🔥">🔥</button><button type="button" data-private-emoji="✨">✨</button></span>'); });
document.addEventListener('focusin', (event) => { const form = event.target.closest('[data-direct-message-form], [data-inbox-reply]'); if (form && !form.querySelector('[data-private-clip-toggle]')) form.querySelector('button').insertAdjacentHTML('beforebegin', '<button type="button" class="private-emoji" data-private-clip-toggle aria-label="Open clipart catalogue">▣</button><span class="private-emoji-catalog private-clip-catalog" hidden><button type="button" data-private-clip="🛍️">🛍️</button><button type="button" data-private-clip="🎁">🎁</button><button type="button" data-private-clip="📦">📦</button><button type="button" data-private-clip="📞">📞</button><button type="button" data-private-clip="📍">📍</button><button type="button" data-private-clip="⭐">⭐</button><button type="button" data-private-clip="✅">✅</button><button type="button" data-private-clip="💬">💬</button></span>'); });
document.addEventListener('focusin', (event) => { const form = event.target.closest('[data-inbox-reply]'); if (form && !form.querySelector('.private-emoji-catalog')) form.insertAdjacentHTML('beforeend', '<span class="private-emoji-catalog" hidden><button type="button" data-private-emoji="😊">😊</button><button type="button" data-private-emoji="👍">👍</button><button type="button" data-private-emoji="❤️">❤️</button><button type="button" data-private-emoji="😂">😂</button><button type="button" data-private-emoji="🙏">🙏</button><button type="button" data-private-emoji="🎉">🎉</button><button type="button" data-private-emoji="🔥">🔥</button><button type="button" data-private-emoji="✨">✨</button></span><span class="private-emoji-catalog private-clip-catalog" hidden><button type="button" data-private-clip="🛍️">🛍️</button><button type="button" data-private-clip="🎁">🎁</button><button type="button" data-private-clip="📦">📦</button><button type="button" data-private-clip="📞">📞</button><button type="button" data-private-clip="📍">📍</button><button type="button" data-private-clip="⭐">⭐</button></span>'); });
document.addEventListener('click', (event) => { const toggle = event.target.closest('[data-private-emoji-toggle]'); if (toggle) { const form = toggle.closest('form'); const catalog = form.querySelector('.private-emoji-catalog:not(.private-clip-catalog)'); const clipCatalog = form.querySelector('.private-clip-catalog'); if (clipCatalog) clipCatalog.hidden = true; if (catalog) catalog.hidden = !catalog.hidden; return; } const emoji = event.target.closest('[data-private-emoji]'); if (!emoji) return; const form = emoji.closest('form'); const input = form.querySelector('input'); input.value += emoji.dataset.privateEmoji; const catalog = emoji.closest('.private-emoji-catalog'); if (catalog) catalog.hidden = true; input.focus(); });
document.addEventListener('click', (event) => { const toggle = event.target.closest('[data-private-clip-toggle]'); if (toggle) { const form = toggle.closest('form'); const catalog = form.querySelector('.private-clip-catalog'); const emojiCatalog = form.querySelector('.private-emoji-catalog:not(.private-clip-catalog)'); if (emojiCatalog) emojiCatalog.hidden = true; if (catalog) catalog.hidden = !catalog.hidden; return; } const clip = event.target.closest('[data-private-clip]'); if (!clip) return; const form = clip.closest('form'); const input = form.querySelector('input'); input.value += clip.dataset.privateClip; const catalog = clip.closest('.private-clip-catalog'); if (catalog) catalog.hidden = true; input.focus(); });
document.addEventListener('focusin', (event) => { const form = event.target.closest('[data-direct-message-form], [data-inbox-reply]'); if (!form) return; const emoji = form.querySelector('[data-private-emoji-toggle]'); const clip = form.querySelector('[data-private-clip-toggle]'); if (emoji) { emoji.textContent = '🤩'; emoji.classList.add('private-picker-image', 'emoji-picker-image'); emoji.title = 'Emoji catalogue'; } if (clip) { clip.textContent = '🧸'; clip.classList.add('private-picker-image', 'clip-picker-image'); clip.title = 'Clipart catalogue'; } });
document.addEventListener('focusin', (event) => { const form = event.target.closest('[data-direct-message-form], [data-inbox-reply]'); const send = form?.querySelector('button[type="submit"]'); if (send) { send.setAttribute('aria-label', 'Send private message'); send.title = 'Send private message'; } });
loadPosts().catch((error) => { document.querySelector('#mediaPosts').textContent = error.message; });
