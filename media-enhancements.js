let selectedMediaAspect = '16:9';
const mediaToolsScript = document.createElement('script');
mediaToolsScript.src = 'media-tools.js';
document.head.append(mediaToolsScript);
let previewUrls = [];
const mediaUploadControl = document.querySelector('.media-upload');
const composerSubmit = document.querySelector('#mediaPostForm > button[type="submit"]');
composerSubmit.setAttribute('aria-label', 'Post to Shagram');
composerSubmit.title = 'Post to Shagram';
composerSubmit.innerHTML = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></svg>';
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
  mediaPreview.replaceChildren();
  const removeLabel = ({ ta: 'அகற்று', hi: 'हटाएँ' })[document.documentElement.lang.split('-')[0]] || 'Remove attachment';
  previewUrls.forEach((url, index) => {
    const file = document.querySelector('#mediaFiles').files[index];
    const item = document.createElement('div');
    item.className = 'media-preview-item';
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
    media.src = url;
    if (media.tagName === 'VIDEO') { media.controls = true; media.preload = 'metadata'; }
    else media.alt = `Media preview ${index + 1}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'media-preview-remove';
    remove.textContent = '×';
    remove.title = removeLabel;
    remove.setAttribute('aria-label', `${removeLabel}: ${file.name}`);
    remove.addEventListener('click', () => {
      const input = document.querySelector('#mediaFiles');
      const remaining = new DataTransfer();
      [...input.files].forEach((file, fileIndex) => { if (fileIndex !== index) remaining.items.add(file); });
      input.files = remaining.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      (mediaPreview.querySelector('.media-preview-remove') || input).focus();
    });
    item.append(media, remove);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'media-preview-edit';
      const editLabel = file.type.startsWith('image/') ? 'Edit image' : 'Music';
      edit.textContent = '✎'; edit.title = editLabel; edit.setAttribute('aria-label', editLabel);
      edit.addEventListener('click', () => file.type.startsWith('image/') ? window.openShagramImageEditor?.(file, index) : window.openShagramMusicEditor?.());
      item.append(edit);
    }
    mediaPreview.append(item);
  });
}

mediaUploadControl.addEventListener('click', event => {
  if (event.target.closest('.global-help-button')) return;
  mediaAspectControls.hidden = true;
});
document.querySelector('#mediaFiles').addEventListener('change', () => {
  mediaAspectControls.hidden = !document.querySelector('#mediaFiles').files.length;
  renderMediaPreview();
});
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
    for (const file of document.querySelector('#mediaFiles').files) {
      if (!file.type.startsWith('video/')) continue;
      const duration = await new Promise((resolve, reject) => {
        const video = document.createElement('video'); const url = URL.createObjectURL(file);
        const finish = (error) => { clearTimeout(timer); video.onloadedmetadata = null; video.onerror = null; URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); error && reject(error); };
        const timer = setTimeout(() => finish(new Error('The video duration could not be verified.')), 15000);
        video.onloadedmetadata = () => { const seconds = video.duration; finish(); resolve(seconds); };
        video.onerror = () => finish(new Error('The video could not be read.'));
        video.preload = 'metadata'; video.src = url;
      });
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('The video duration could not be verified.');
      if (selectedMediaAspect === '9:16' && duration > 60) throw new Error('Portrait reels must be 60 seconds or shorter.');
    }
    const result = await baseMediaRequest(path, { ...options, body: JSON.stringify({ ...JSON.parse(options.body || '{}'), aspectRatio: selectedMediaAspect, musicId: document.querySelector('#shagramMusic')?.value || '' }) });
    window.resetShagramMusic?.();
    previewUrls.forEach((url) => URL.revokeObjectURL(url)); previewUrls = []; mediaPreview.replaceChildren(); mediaAspectControls.hidden = true;
    return result;
  }
  return baseMediaRequest(path, options);
};

const baseLoadPosts = loadPosts;
loadPosts = async () => {
  const openPostId = document.querySelector('.shagram-watch[open] .media-post')?.id || (!window.shagramBrowseInitialized && /^#post-\d+$/.test(location.hash) ? location.hash.slice(1) : undefined);
  await baseLoadPosts();
  window.refreshShagramProfileSummary?.();
  const renderedPosts = [...document.querySelectorAll('.media-post')];
  renderedPosts.forEach((element, index) => {
    const post = viewer && document.querySelector('#mediaPosts') ? undefined : undefined;
    element.classList.remove('aspect-16-9', 'aspect-9-16');
  });
  const data = await baseMediaRequest('/api/media/posts');
  window.shagramRenderedPostIds = new Set(data.posts.map(post => post.id));
  window.syncShagramNewPosts?.();
  if (data.viewer?.role === 'Customer' && !document.querySelector('.media-header [href="saved-posts.html"]')) document.querySelector('.media-header nav')?.insertAdjacentHTML('beforeend', '<a href="saved-posts.html">Saved</a>');
  [...document.querySelectorAll('.media-post')].forEach((element, index) => {
    const post = data.posts[index];
    if (!post) return;
    if (post.music) {
      const credit = document.createElement('div'); credit.className = 'post-music-credit';
      const source = document.createElement('a'); source.href = post.music.source; source.textContent = `${post.music.title} — ${post.music.artist}`; source.translate = false; source.target = '_blank'; source.rel = 'noopener noreferrer';
      const license = document.createElement('a'); license.href = post.music.licenseUrl; license.textContent = post.music.license; license.target = '_blank'; license.rel = 'noopener noreferrer';
      const changes = document.createElement('span'); changes.textContent = 'Music trimmed or looped to fit.';
      const reuse = document.createElement('button'); reuse.type = 'button'; reuse.textContent = 'Use this music'; reuse.onclick = () => window.reuseShagramMusic?.(post.music.id);
      credit.append(source, document.createTextNode(' · '), license, changes, reuse);
      element.append(credit);
    }
    element.querySelector('.post-author small')?.remove();
    const author = element.querySelector('.post-author strong');
    if (author) {
      const link = document.createElement('button');
      link.type = 'button'; link.className = 'post-profile-link';
      link.textContent = post.author; link.translate = false;
      link.addEventListener('click', () => window.openShagramProfile?.(post.accountId));
      author.replaceWith(link);
    }
    element.id = `post-${post.id}`;
    element.dataset.aspectRatio = post.aspectRatio || '16:9';
    element.querySelector('.post-media')?.classList.add(`aspect-${(post.aspectRatio || '16:9').replace(':', '-')}`);
    classifyMediaPost(element);
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
    const directMessageForm = element.querySelector('[data-direct-message-form]');
    // Messaging must not squeeze the reaction icons into different sizes.
    if (directMessageForm && actions) {
      actions.after(directMessageForm);
      directMessageForm.hidden = true;
      directMessageForm.id = `message-owner-${post.id}`;
      const messageToggle = document.createElement('button');
      messageToggle.type = 'button';
      messageToggle.className = 'message-owner-toggle';
      messageToggle.title = 'Message in Shachat';
      messageToggle.setAttribute('aria-label', 'Message in Shachat');
      messageToggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
      actions.querySelector('.post-share').after(messageToggle);
      messageToggle.addEventListener('click', () => {
        window.location.href = `chat.html?author=${encodeURIComponent(post.accountId)}`;
      });
      const send = directMessageForm.querySelector('[type="submit"]');
      send.title = 'Send private message';
      send.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></svg>';
      directMessageForm.remove();
    }
  });
  // Legacy messages remain stored; no separate floating inbox or new legacy sends.
  document.querySelector('#privateInbox')?.remove();
  buildShagramBrowse(data, openPostId);
};

function buildShagramBrowse(data, openPostId) {
  window.shagramBrowseInitialized=true;
  const feed=document.querySelector('#mediaPosts');
  const articles=new Map([...feed.querySelectorAll('.media-post')].map(node=>[node.id,node]));
  const storage=document.createElement('div');storage.hidden=true;
  articles.forEach(node=>storage.append(node));feed.replaceChildren(storage);feed.classList.add('shagram-browse');
  const dictionary={Videos:['வீடியோக்கள்','वीडियो'],Reels:['ரீல்கள்','रील्स'],Photos:['புகைப்படங்கள்','फ़ोटो'],Close:['மூடு','बंद करें'],'Open post':['பதிவைத் திற','पोस्ट खोलें']};
  const text=key=>dictionary[key]?.[document.documentElement.lang.startsWith('ta')?0:document.documentElement.lang.startsWith('hi')?1:2]||key;
  const label=(node,key)=>{node.dataset.browseLabel=key;node.translate=false;node.textContent=text(key);};
  const dialog=document.createElement('dialog');dialog.className='shagram-watch';dialog.setAttribute('aria-label','Shagram');
  const close=document.createElement('button');close.type='button';close.className='shagram-watch-close';label(close,'Close');close.onclick=()=>dialog.close();dialog.append(close);feed.append(dialog);
  let returnButton;
  dialog.addEventListener('close',()=>{dialog.querySelectorAll('video').forEach(v=>v.pause());const article=dialog.querySelector('.media-post');if(article)storage.append(article);returnButton?.focus();});
  const open=(id,button)=>{const article=articles.get(id);if(!article)return;returnButton=button;dialog.append(article);dialog.showModal();};
  const groups={};
  for(const name of ['Videos','Reels','Photos']){const section=document.createElement('section');section.className='shagram-browse-section';const heading=document.createElement('h2');label(heading,name);const grid=document.createElement('div');grid.className='shagram-preview-grid';if(name==='Reels')grid.classList.add('shagram-reel-row');section.append(heading,grid);feed.append(section);groups[name]={section,grid};section.hidden=true;}
  for(const post of data.posts){const first=post.media[0];if(!first)continue;const video=first.type.startsWith('video/');const group=video?(post.aspectRatio==='9:16'?'Reels':'Videos'):'Photos';const button=document.createElement('button');button.type='button';button.className='shagram-preview';button.dataset.postPreview=post.id;
    const frame=document.createElement('span');frame.className='shagram-preview-frame';const media=document.createElement(video?'video':'img');media.src=first.url;media.setAttribute('aria-hidden','true');if(video){media.muted=true;media.preload='metadata';media.playsInline=true;}else{media.alt='';media.loading='lazy';}frame.append(media);
    if(video){const play=document.createElement('span');play.className='shagram-preview-play';play.textContent='▶';play.setAttribute('aria-hidden','true');frame.append(play);}
    const author=document.createElement('strong');author.textContent=post.author;author.translate=false;const caption=document.createElement('span');caption.className='shagram-preview-caption';caption.textContent=post.caption||text('Open post');caption.translate=false;
    button.append(frame,author,caption);button.onclick=()=>open(`post-${post.id}`,button);groups[group].grid.append(button);groups[group].section.hidden=false;
    if(openPostId===`post-${post.id}`)open(openPostId,button);
  }
  if(!data.posts.length){const empty=document.createElement('p');empty.textContent='No media posts yet.';feed.append(empty);}
  const update=()=>feed.querySelectorAll('[data-browse-label]').forEach(n=>label(n,n.dataset.browseLabel));
  if(window.shagramBrowseLanguageHandler)document.removeEventListener('languagechange',window.shagramBrowseLanguageHandler);
  window.shagramBrowseLanguageHandler=update;document.addEventListener('languagechange',update);
}

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
