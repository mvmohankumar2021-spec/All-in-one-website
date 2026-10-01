const viewTokenFromHash = new URLSearchParams(window.location.hash.slice(1)).get('adminView');
if (viewTokenFromHash) { sessionStorage.setItem('shakalpaAdminVendorView', viewTokenFromHash); history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); }
const adminVendorViewToken = sessionStorage.getItem('shakalpaAdminVendorView');
if (adminVendorViewToken) { const nativeFetch = window.fetch.bind(window); window.fetch = (resource, options = {}) => { const headers = new Headers(options.headers || (resource instanceof Request ? resource.headers : undefined)); headers.set('X-SHAKALPA-Admin-Vendor-View', adminVendorViewToken); return nativeFetch(resource, { ...options, headers }); }; }
const mediaVisibilityStyles = document.createElement('style'); mediaVisibilityStyles.textContent = '#postComposer[hidden],#signinMedia[hidden]{display:none!important}#signinMedia{margin:0;padding:0;border:0;background:none;box-shadow:none}#signinMedia>p{display:none}'; document.head.append(mediaVisibilityStyles);
// Use the normal sign-in window, then return to Shagram, for either account role.
const mediaSignIn = document.querySelector('#signinMedia');
const mediaSignInLink = mediaSignIn.querySelector('a');
mediaSignInLink.href = 'index.html?login=all&next=media.html';
document.querySelector('header').append(mediaSignIn);
document.body.classList.add('shagram-page');
document.querySelector('#postComposer > .eyebrow')?.remove();
const shagramBrand = document.querySelector('.media-header > .brand');
if (shagramBrand) {
  shagramBrand.innerHTML = '<img class="shagram-logo" src="shagram-logo.svg" alt="Shagram" width="176" height="38">';
  shagramBrand.href = 'media.html';
}
function classifyMediaPost(post) {
  const selectedAspect = post.dataset.aspectRatio;
  if (selectedAspect === '9:16' || selectedAspect === '16:9') {
    post.classList.toggle('portrait-post', selectedAspect === '9:16');
    return;
  }
  const media = [...post.querySelectorAll('.post-media img,.post-media video')];
  const portrait = media.length > 0 && media.every(item => {
    const width = item.naturalWidth || item.videoWidth;
    const height = item.naturalHeight || item.videoHeight;
    if (width > 0 && height > 0) {
      item.style.aspectRatio = `${width} / ${height}`;
      return height > width;
    }
    return post.querySelector('.post-media')?.classList.contains('aspect-9-16');
  });
  post.classList.toggle('portrait-post', portrait);
}
const mediaFeed = document.querySelector('#mediaPosts');
for (const eventName of ['load', 'loadedmetadata']) mediaFeed.addEventListener(eventName, event => {
  const post = event.target.closest?.('.media-post');
  if (post) classifyMediaPost(post);
}, true);
const toast = (message) => window.alert(message);
let viewer = null;
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = String(value); return node.innerHTML; }
function mediaHtml(item) { return item.type.startsWith('video/') ? `<video controls preload="metadata" src="${escapeHtml(item.url)}"></video>` : `<img src="${escapeHtml(item.url)}" alt="Post media"/>`; }
async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error('The service is unavailable. Please restart the app server and refresh this page.');
  }
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
async function loadPosts() { const data = await request('/api/media/posts'); viewer = data.viewer; document.querySelector('#postComposer').hidden = !viewer || !['Vendor', 'Customer'].includes(viewer.role); document.querySelector('#signinMedia').hidden = Boolean(viewer && ['Vendor', 'Customer'].includes(viewer.role)); const target = document.querySelector('#mediaPosts'); target.innerHTML = data.posts.map((post) => `<article class="media-post"><div class="post-top"><div class="post-author"><strong>${escapeHtml(post.author)}</strong><small>${escapeHtml(post.role)}</small></div>${viewer && viewer.id !== post.accountId ? `<button class="follow-button ${post.following ? 'following' : ''}" data-follow="${post.accountId}">${post.following ? 'Following' : 'Follow'}</button>` : ''}</div>${post.caption ? `<p class="post-caption">${escapeHtml(post.caption)}</p>` : ''}<div class="post-media">${post.media.map(mediaHtml).join('')}</div><div class="post-actions">${viewer ? `<button class="like-button ${post.liked ? 'liked' : ''}" data-like="${post.id}">${post.liked ? '♥ Liked' : '♡ Like'} · ${post.likes}</button>` : `<span class="like-summary" aria-label="${post.likes} reactions"><span aria-hidden="true">♡</span><b>${post.likes}</b></span>`}</div><div class="post-comments">${post.comments.map((comment) => `<p class="post-comment"><strong>${escapeHtml(comment.author)}</strong>${escapeHtml(comment.body)}</p>`).join('')}${viewer ? `<form class="comment-form" data-comment="${post.id}"><input maxlength="1000" placeholder="Add a comment or emoji…" required/><button>Post</button></form>` : ''}</div></article>`).join('') || '<p class="empty-media">No media posts yet. Be the first to share one.</p>'; }
const loadMediaPosts = loadPosts;
loadPosts = async () => {
  await loadMediaPosts();
  if (!viewer) { window.location.replace('index.html?login=all&next=media.html'); return; }
  mediaSignIn.hidden = true;
  mediaFeed.querySelectorAll('.media-post').forEach(classifyMediaPost);
  document.querySelector('#postComposer .eyebrow')?.remove();
};
document.querySelector('#mediaPostForm').addEventListener('submit', async (event) => { event.preventDefault(); const error = document.querySelector('#mediaError'); const files = [...document.querySelector('#mediaFiles').files]; const allowed = ['image/jpeg','image/png','image/webp','video/mp4','video/webm']; if (!files.length || files.length > 4 || files.some((file) => !allowed.includes(file.type) || file.size > 8 * 1024 * 1024)) { error.textContent = 'Choose 1–4 valid images or videos smaller than 8 MB.'; return; } error.textContent = ''; const read = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); try { await request('/api/media/posts', { method: 'POST', body: JSON.stringify({ caption: document.querySelector('#mediaCaption').value, media: await Promise.all(files.map(read)) }) }); event.target.reset(); await loadPosts(); } catch (err) { error.textContent = err.message; } });
document.querySelector('#mediaPosts').addEventListener('click', async (event) => { const like = event.target.closest('[data-like]'); const follow = event.target.closest('[data-follow]'); try { if (like) await request('/api/media/like', { method: 'POST', body: JSON.stringify({ postId: Number(like.dataset.like) }) }); if (follow) await request('/api/media/follow', { method: 'POST', body: JSON.stringify({ accountId: Number(follow.dataset.follow) }) }); if (like || follow) await loadPosts(); } catch (err) { toast(err.message); } });
document.querySelector('#mediaPosts').addEventListener('submit', async (event) => { if (!event.target.matches('.comment-form')) return; event.preventDefault(); const input = event.target.querySelector('input'); try { await request('/api/media/comment', { method: 'POST', body: JSON.stringify({ postId: Number(event.target.dataset.comment), body: input.value }) }); await loadPosts(); } catch (err) { toast(err.message); } });
document.querySelector('#refreshMedia').addEventListener('click', () => loadPosts().catch((error) => toast(error.message))); loadPosts().catch((error) => { document.querySelector('#mediaPosts').textContent = error.message; });
