let savedData = { tags: [], posts: [] };
let activeTagId = null;
let editingPost = null;

async function savedRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function savedToast(message) { const node = document.querySelector('#savedToast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2600); }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = String(value); return node.innerHTML; }
function mediaMarkup(post) { const item = post.media[0]; if (!item) return '<div class="saved-media-placeholder">No media</div>'; return item.type.startsWith('video/') ? `<video preload="metadata" src="${escapeHtml(item.url)}"></video><span class="saved-play">▶</span>` : `<img src="${escapeHtml(item.url)}" alt="Saved Shagram post by ${escapeHtml(post.author)}"/>`; }
function renderSaved() {
  const tagList = document.querySelector('#tagList');
  tagList.innerHTML = `<button class="saved-tag ${activeTagId === null ? 'active' : ''}" data-tag="">All saved <span>${savedData.posts.length}</span></button>${savedData.tags.map((tag) => `<button class="saved-tag ${activeTagId === tag.id ? 'active' : ''}" data-tag="${tag.id}">${escapeHtml(tag.name)} <span>${savedData.posts.filter((post) => post.tagIds.includes(tag.id)).length}</span></button>`).join('')}`;
  const posts = activeTagId === null ? savedData.posts : savedData.posts.filter((post) => post.tagIds.includes(activeTagId));
  const selectedTag = savedData.tags.find((tag) => tag.id === activeTagId);
  document.querySelector('#savedViewLabel').textContent = selectedTag ? selectedTag.name.toUpperCase() : 'ALL SAVED';
  document.querySelector('#savedCount').textContent = `${posts.length} saved ${posts.length === 1 ? 'post' : 'posts'}`;
  document.querySelector('#savedPosts').innerHTML = posts.map((post) => `<article class="saved-post-card"><div class="saved-post-media aspect-${(post.aspectRatio || '16:9').replace(':', '-')}">${mediaMarkup(post)}</div><div class="saved-post-copy"><small>${escapeHtml(post.role)} · ${escapeHtml(post.author)}</small><p>${escapeHtml(post.caption || 'Untitled post')}</p><div class="saved-card-footer"><span>${post.tags.map((tag) => `<i>${escapeHtml(tag.name)}</i>`).join('') || 'No tags yet'}</span><button type="button" data-organise-post="${post.id}">Organise</button></div></div></article>`).join('') || '<div class="saved-empty"><h2>Nothing saved here yet.</h2><p>Save a Shagram post, then return here to add your own tags.</p><a class="button button-lime" href="media.html">Explore Shagram <span>→</span></a></div>';
}
async function loadSaved() { savedData = await savedRequest('/api/media/saved'); renderSaved(); }
document.querySelector('#tagList').addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; activeTagId = button.dataset.tag === '' ? null : Number(button.dataset.tag); renderSaved(); });
const tagPostDialog = document.querySelector('#tagPostDialog');
document.querySelector('#savedPosts').addEventListener('click', (event) => { const button = event.target.closest('[data-organise-post]'); if (!button) return; editingPost = savedData.posts.find((post) => post.id === Number(button.dataset.organisePost)); if (!editingPost) return; document.querySelector('#postTagOptions').innerHTML = savedData.tags.map((tag) => `<label><input type="checkbox" value="${tag.id}" ${editingPost.tagIds.includes(tag.id) ? 'checked' : ''}/> ${escapeHtml(tag.name)}</label>`).join('') || '<p>Create a tag first, then organise this post.</p>'; document.querySelector('#tagPostError').textContent = ''; tagPostDialog.showModal(); });
document.querySelector('#tagPostForm').addEventListener('submit', async (event) => { event.preventDefault(); const tagIds = [...document.querySelectorAll('#postTagOptions input:checked')].map((input) => Number(input.value)); try { await savedRequest('/api/media/saved/tags', { method: 'POST', body: JSON.stringify({ postId: editingPost.id, tagIds }) }); tagPostDialog.close(); await loadSaved(); savedToast('Tags saved.'); } catch (error) { document.querySelector('#tagPostError').textContent = error.message; } });
document.querySelector('.close-tag-dialog').addEventListener('click', () => tagPostDialog.close());
const createTagDialog = document.querySelector('#createTagDialog');
document.querySelector('#newTagButton').addEventListener('click', () => { document.querySelector('#createTagForm').reset(); document.querySelector('#createTagError').textContent = ''; createTagDialog.showModal(); });
document.querySelector('.close-create-tag').addEventListener('click', () => createTagDialog.close());
document.querySelector('#createTagForm').addEventListener('submit', async (event) => { event.preventDefault(); try { const tag = await savedRequest('/api/media/save-tags', { method: 'POST', body: JSON.stringify({ name: document.querySelector('#newTagName').value }) }); createTagDialog.close(); await loadSaved(); activeTagId = tag.id; renderSaved(); savedToast('Tag created.'); } catch (error) { document.querySelector('#createTagError').textContent = error.message; } });
loadSaved().catch((error) => { document.querySelector('#savedPosts').innerHTML = `<div class="saved-empty"><h2>Saved posts are for Customers</h2><p>${escapeHtml(error.message)}</p><a class="button button-dark" href="index.html">Sign in as a Customer <span>→</span></a></div>`; });
