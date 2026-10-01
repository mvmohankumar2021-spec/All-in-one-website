/* Public profile fields are separate from private account data. */
(() => {
  const musicBox = document.createElement('div'); musicBox.className = 'shagram-music-picker';
  const musicTitle = document.createElement('label'); musicTitle.htmlFor = 'shagramMusic'; musicTitle.textContent = 'Creative Commons music';
  const musicSelect = document.createElement('select'); musicSelect.id = 'shagramMusic';
  const none = document.createElement('option'); none.value = ''; none.textContent = 'No added music'; musicSelect.append(none);
  const musicHelp = document.createElement('small'); musicHelp.textContent = 'Music replaces original audio. Images become 10-second videos. Credits are included automatically.';
  const preview = document.createElement('audio'); preview.controls = true; preview.hidden = true; preview.preload = 'none';
  const filters = document.createElement('div'); filters.className = 'music-filters';
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search music or artist'; search.setAttribute('aria-label', 'Search music or artist');
  function filterSelect(label, values) {
    const select = document.createElement('select'); select.setAttribute('aria-label', label);
    for (const [value, title] of values) { const option = document.createElement('option'); option.value = value; option.textContent = title; select.append(option); }
    filters.append(select); return select;
  }
  const language = filterSelect('Music language', [['','All languages'],['ta','Tamil'],['hi','Hindi'],['ur','Urdu'],['en','English'],['instrumental','Instrumental']]);
  const category = filterSelect('Music category', [['','All categories']]);
  const mood = filterSelect('Music mood', [['','All moods']]);
  const resultStatus = document.createElement('small'); resultStatus.setAttribute('role', 'status');
  const details = document.createElement('div'); details.className = 'music-selection-details';
  const discovery = document.createElement('div'); discovery.className = 'music-discovery';
  const discoveryNote = document.createElement('small'); discoveryNote.textContent = 'Listen elsewhere: these links do not add music to your reel or grant reuse rights.';
  const externalLinks = document.createElement('div'); externalLinks.className = 'music-discovery-links';
  const youtube = document.createElement('a'); youtube.textContent = 'Search YouTube';
  const spotify = document.createElement('a'); spotify.textContent = 'Search Spotify';
  for (const link of [youtube, spotify]) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  externalLinks.append(youtube, spotify); discovery.append(discoveryNote, externalLinks);
  function updateDiscovery() {
    const track = tracks.find(item => item.id === musicSelect.value);
    const query = search.value.trim() || (track ? `${track.title} ${track.artist}` : [language.value && language.value !== 'instrumental' ? language.value : '', category.value || 'music'].filter(Boolean).join(' '));
    youtube.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    spotify.href = 'https://open.spotify.com/search/' + encodeURIComponent(query);
  }
  musicBox.append(musicTitle, search, filters, resultStatus, musicSelect, details, musicHelp, preview, discovery);
  document.querySelector('#mediaCaption').after(musicBox);
  let tracks = [];
  function renderTracks() {
    const selected = musicSelect.value;
    const query = search.value.trim().toLocaleLowerCase();
    const matching = tracks.filter(track => (!language.value || (track.languages || []).includes(language.value)) && (!category.value || track.category === category.value) && (!mood.value || track.mood === mood.value) && `${track.title} ${track.artist}`.toLocaleLowerCase().includes(query));
    musicSelect.replaceChildren(none);
    for (const track of matching) { const option = document.createElement('option'); option.value = track.id; option.textContent = `${track.title} — ${track.artist} (${track.license})`; option.translate = false; musicSelect.append(option); }
    // Keep an already chosen soundtrack intact while browsing other categories.
    const chosen = tracks.find(track => track.id === selected);
    if (chosen && !matching.includes(chosen)) { const option = document.createElement('option'); option.value = chosen.id; option.textContent = `${chosen.title} — ${chosen.artist}`; option.translate = false; musicSelect.append(option); }
    musicSelect.value = selected || '';
    resultStatus.textContent = matching.length ? 'Matching tracks: ' + matching.length : 'No verified tracks match these filters yet.';
    updateDiscovery();
  }
  search.addEventListener('input', renderTracks);
  for (const filter of [language, category, mood]) filter.addEventListener('change', renderTracks);
  request('/api/media/music').then(data => {
    tracks = data.tracks;
    for (const [select, key] of [[category,'category'],[mood,'mood']]) for (const value of [...new Set(tracks.map(track => track[key]).filter(Boolean))].sort()) { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }
    renderTracks();
  }).catch(() => { musicHelp.textContent = 'Music catalogue is unavailable. You can still post without music.'; });
  musicSelect.onchange = () => {
    updateDiscovery();
    preview.pause();
    const track = tracks.find(item => item.id === musicSelect.value);
    preview.hidden = !track;
    details.replaceChildren();
    if (track) {
      const source = document.createElement('a'); source.href = track.source; source.textContent = `${track.title} — ${track.artist}`; source.translate = false; source.target = '_blank'; source.rel = 'noopener noreferrer';
      const license = document.createElement('a'); license.href = track.licenseUrl; license.textContent = track.license; license.target = '_blank'; license.rel = 'noopener noreferrer';
      const note = document.createElement('small'); note.textContent = track.production || track.description || '';
      details.append(source, document.createTextNode(' · '), license, note);
    }
    if (track) preview.src = `/assets/music/${encodeURIComponent(track.file)}`;
    else { preview.removeAttribute('src'); preview.load(); }
  };
  updateDiscovery();
  window.resetShagramMusic = () => { musicSelect.value = ''; musicSelect.onchange(); };
  window.reuseShagramMusic = id => {
    if (!tracks.some(track => track.id === id)) return;
    search.value = ''; language.value = ''; category.value = ''; mood.value = ''; renderTracks();
    musicSelect.value = id; musicSelect.onchange(); musicSelect.scrollIntoView({ block: 'center', behavior: 'smooth' }); musicSelect.focus();
  };
  function modal(title) {
    const dialog = document.createElement('dialog');
    dialog.className = 'shagram-dialog';
    const heading = document.createElement('h2'); heading.textContent = title;
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×';
    close.className = 'shagram-dialog-close'; close.setAttribute('aria-label', 'Close');
    close.onclick = () => dialog.close();
    dialog.append(heading, close); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal(); return dialog;
  }
  window.openShagramProfile = async accountId => {
    const dialog = modal('Public profile');
    try {
      const data = await request(`/api/media/profile?accountId=${encodeURIComponent(accountId)}`);
      if (!dialog.isConnected) return;
      const name = document.createElement('h3'); name.textContent = data.name; name.translate = false;
      const counts = document.createElement('div'); counts.className = 'profile-counts';
      for (const [key, label] of [['posts', 'Posts'], ['followers', 'Followers'], ['following', 'Following']]) {
        const item = document.createElement('p');
        const number = document.createElement('strong'); number.textContent = data.counts[key];
        const caption = document.createElement('span'); caption.textContent = label;
        item.append(number, caption); counts.append(item);
      }
      dialog.append(name, counts);
      if (data.editable) {
        const form = document.createElement('form');
        const notice = document.createElement('p'); notice.textContent = 'Only fill in details you want everyone to see. Leave fields empty to keep them private.';
        form.append(notice);
        for (const [key, label, limit] of [['bio', 'About me', 500], ['location', 'Location', 100], ['website', 'Website', 300]]) {
          const wrapper = document.createElement('label'); wrapper.textContent = label;
          const input = document.createElement(key === 'bio' ? 'textarea' : 'input');
          input.name = key; input.value = data[key]; input.maxLength = limit;
          if (key === 'website') input.type = 'url';
          wrapper.append(input); form.append(wrapper);
        }
        const save = document.createElement('button'); save.textContent = 'Save public profile'; save.type = 'submit';
        const status = document.createElement('p'); status.setAttribute('role', 'status');
        form.append(save, status);
        form.onsubmit = async event => {
          event.preventDefault(); save.disabled = true;
          try { await request('/api/media/profile', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); status.textContent = 'Public profile saved.'; }
          catch (error) { status.textContent = error.message; }
          finally { save.disabled = false; }
        };
        dialog.append(form);
      } else {
        for (const key of ['bio', 'location', 'website']) if (data[key]) {
          const item = document.createElement(key === 'website' ? 'a' : 'p'); item.textContent = data[key]; item.translate = false;
          if (key === 'website' && /^https?:\/\//i.test(data[key])) { item.href = data[key]; item.target = '_blank'; item.rel = 'noopener noreferrer'; }
          dialog.append(item);
        }
        if (!data.bio && !data.location && !data.website) { const empty = document.createElement('p'); empty.textContent = 'No public details shared yet.'; dialog.append(empty); }
      }
    } catch (error) { const notice = document.createElement('p'); notice.textContent = error.message; dialog.append(notice); }
  };
  // Available even before the user has published their first post.
  const own = document.createElement('button'); own.type = 'button'; own.className = 'shagram-own-profile'; own.textContent = 'My public profile';
  own.onclick = () => { if (viewer) window.openShagramProfile(viewer.id); };
  document.querySelector('.feed-heading').append(own);

  window.openShagramImageEditor = async (file, index) => {
    const dialog = modal('Edit image');
    const canvas = document.createElement('canvas'); canvas.className = 'shagram-edit-canvas'; dialog.append(canvas);
    const url = URL.createObjectURL(file); const image = new Image();
    dialog.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
    image.src = url;
    try { await image.decode(); } catch { dialog.close(); return; }
    if (!dialog.isConnected) return;
    const form = document.createElement('form'); form.className = 'shagram-edit-controls';
    const state = { brightness: 100, contrast: 100, saturation: 100, zoom: 1, x: 50, y: 50, emoji: '', frame: 'none' };
    const ratio = selectedMediaAspect === '9:16' ? 9 / 16 : 16 / 9;
    canvas.width = ratio < 1 ? 720 : 1280; canvas.height = ratio < 1 ? 1280 : 720;
    function draw() {
      const ctx = canvas.getContext('2d');
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * state.zoom;
      const sw = canvas.width / scale, sh = canvas.height / scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
      ctx.drawImage(image, (image.width - sw) * state.x / 100, (image.height - sh) * state.y / 100, sw, sh, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      if (state.frame !== 'none') {
        ctx.lineWidth = 30; ctx.strokeStyle = state.frame;
        if (state.frame === 'rainbow') { const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); ['#ff5252','#ffc107','#4caf50','#448aff','#ab47bc'].forEach((c, i) => gradient.addColorStop(i / 4, c)); ctx.strokeStyle = gradient; }
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
      }
      ctx.font = '80px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state.emoji, canvas.width / 2, canvas.height - 50);
    }
    for (const [key, label, min, max, step] of [['brightness','Brightness',50,150,1],['contrast','Contrast',50,150,1],['saturation','Colour',0,200,1],['zoom','Crop zoom',1,3,0.05],['x','Horizontal position',0,100,1],['y','Vertical position',0,100,1]]) {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      const input = document.createElement('input'); Object.assign(input, { type: 'range', min, max, step, value: state[key] });
      input.oninput = () => { state[key] = Number(input.value); draw(); }; wrapper.append(input); form.append(wrapper);
    }
    for (const [key, label, options] of [['emoji','Emoji',['','😎','😂','😍','🎉','❤️','🔥']], ['frame','Frame',['none','rainbow','#ffffff','#ff69b4','#ffd700']]]) {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      const select = document.createElement('select');
      for (const value of options) { const option = document.createElement('option'); option.value = value; option.textContent = ({none:'None',rainbow:'Rainbow','#ffffff':'White','#ff69b4':'Pink','#ffd700':'Gold'})[value] || value || 'None'; select.append(option); }
      select.onchange = () => { state[key] = select.value; draw(); }; wrapper.append(select); form.append(wrapper);
    }
    const apply = document.createElement('button'); apply.type = 'submit'; apply.textContent = 'Apply edits'; form.append(apply);
    form.onsubmit = event => {
      event.preventDefault(); apply.disabled = true;
      canvas.toBlob(blob => {
        if (!blob) { apply.disabled = false; return; }
        const input = document.querySelector('#mediaFiles');
        if (input.files[index] !== file) { dialog.close(); return; }
        const files = new DataTransfer();
        [...input.files].forEach((item, i) => files.items.add(i === index ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '-edited.jpg', { type: 'image/jpeg' }) : item));
        input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true })); dialog.close();
      }, 'image/jpeg', 0.9);
    };
    dialog.append(form); draw();
  };
})();
