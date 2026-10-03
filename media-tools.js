/* Public profile fields are separate from private account data. */
(() => {
  const musicBox = document.createElement('div'); musicBox.className = 'shagram-music-picker';
  const musicTitle = document.createElement('label'); musicTitle.htmlFor = 'shagramMusic'; musicTitle.textContent = 'Creative Commons music';
  const musicSelect = document.createElement('select'); musicSelect.id = 'shagramMusic';
  const none = document.createElement('option'); none.value = ''; none.textContent = 'No added music'; musicSelect.append(none);
  const musicHelp = document.createElement('small'); musicHelp.textContent = 'Music replaces original audio. Images become 10-second videos. Credits are included automatically.';
  const preview = document.createElement('audio'); preview.controls = true; preview.hidden = true; preview.preload = 'metadata';
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
  const moreOptions = document.createElement('details'); moreOptions.className = 'music-more-options';
  const moreSummary = document.createElement('summary'); moreSummary.textContent = 'Filters and listening links';
  moreOptions.append(moreSummary, filters, discovery);
  musicBox.append(musicTitle, search, musicSelect, preview, details, musicHelp, moreOptions, resultStatus);
  const musicEditor = document.createElement('details'); musicEditor.className = 'shagram-music-editor';
  musicEditor.hidden = true;
  const editorSummary = document.createElement('summary');
  const editorLabel = document.createElement('span'); editorLabel.textContent = 'Edit post / video music';
  const selectedLabel = document.createElement('small'); selectedLabel.translate = false;
  editorSummary.append(editorLabel, selectedLabel); musicEditor.append(editorSummary, musicBox);
  document.querySelector('#mediaPreview').after(musicEditor);
  musicEditor.addEventListener('toggle', () => { if (!musicEditor.open) preview.pause(); });
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
    selectedLabel.textContent = track ? ' · ' + track.title : '';
    preview.hidden = !track;
    details.replaceChildren();
    if (track) {
      const source = document.createElement('a'); source.href = track.source; source.textContent = `${track.title} — ${track.artist}`; source.translate = false; source.target = '_blank'; source.rel = 'noopener noreferrer';
      const license = document.createElement('a'); license.href = track.licenseUrl; license.textContent = track.license; license.target = '_blank'; license.rel = 'noopener noreferrer';
      const note = document.createElement('small'); note.textContent = track.production || track.description || '';
      details.append(source, document.createTextNode(' · '), license, note);
    }
    // Load metadata on selection so duration is available before pressing Play.
    if (track) { preview.src = `/assets/music/${encodeURIComponent(track.file)}`; preview.load(); }
    else { preview.removeAttribute('src'); preview.load(); }
  };
  updateDiscovery();
  window.resetShagramMusic = () => { musicSelect.value = ''; musicSelect.onchange(); musicEditor.open = false; };
  window.reuseShagramMusic = id => {
    if (!tracks.some(track => track.id === id)) return;
    search.value = ''; language.value = ''; category.value = ''; mood.value = ''; renderTracks();
    musicSelect.value = id; musicSelect.onchange(); window.openShagramMusicEditor();
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
  window.openShagramMusicEditor = () => {
    const dialog = modal('Music');dialog.append(musicBox);
    dialog.addEventListener('close',()=>{preview.pause();musicEditor.append(musicBox);},{once:true});
    musicSelect.focus();
  };
  window.openShagramProfile = async accountId => {
    const dialog = modal('Public profile');
    dialog.classList.add('shagram-profile-view');
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
      const profileHeader=document.createElement('div');profileHeader.className='shagram-profile-header';
      const portrait=document.createElement('div');portrait.className='shagram-profile-portrait';
      if(data.editable && own.querySelector('img')) portrait.append(own.querySelector('img').cloneNode(true));
      else {portrait.textContent=data.name.trim().charAt(0).toUpperCase();portrait.translate=false;}
      const identity=document.createElement('div');identity.append(name,counts);profileHeader.append(portrait,identity);dialog.append(profileHeader);
      const publicBio=document.createElement('div');publicBio.className='shagram-public-bio';dialog.append(publicBio);
      function renderBio(values){publicBio.replaceChildren();for(const key of ['bio','location','website'])if(values[key]){const item=document.createElement(key==='website'?'a':'p');item.textContent=values[key];item.translate=false;if(key==='website'&&/^https?:\/\//i.test(values[key])){item.href=values[key];item.target='_blank';item.rel='noopener noreferrer';}publicBio.append(item);}if(!values.bio&&!values.location&&!values.website){const empty=document.createElement('p');empty.textContent='No public details shared yet.';publicBio.append(empty);}}
      if(data.editable)renderBio(data);
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
          try { const values=Object.fromEntries(new FormData(form));await request('/api/media/profile', { method: 'POST', body: JSON.stringify(values) });renderBio(values); status.textContent = 'Public profile saved.'; }
          catch (error) { status.textContent = error.message; }
          finally { save.disabled = false; }
        };
        const editProfile=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Edit public profile';editProfile.append(summary,form);dialog.append(editProfile);
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
  own.title='My public profile';own.setAttribute('aria-label','My public profile');own.textContent='👤';
  request('/api/session').then(({account})=>{if(!account){own.hidden=true;return;}if(account.profileImage){const photo=document.createElement('img');photo.src=account.profileImage;photo.alt='';photo.onerror=()=>{own.textContent='👤';};own.replaceChildren(photo);}else{own.textContent=(account.firstName||'?').charAt(0).toUpperCase();own.translate=false;}}).catch(()=>{});
  own.onclick = () => { if (viewer) window.openShagramProfile(viewer.id); };
  const composerActions=document.createElement('div');composerActions.className='shagram-composer-actions';
  const refresh=document.querySelector('#refreshMedia');
  refresh.hidden=true;
  refresh.classList.add('shagram-new-posts');
  refresh.setAttribute('translate','no');
  const updateNewPostsLabel=()=>{const lang=document.documentElement.lang.split('-')[0];refresh.textContent=({ta:'புதிய பதிவுகள் உள்ளன',hi:'नई पोस्ट उपलब्ध हैं'})[lang]||'New posts available';refresh.setAttribute('aria-label',refresh.textContent);};
  updateNewPostsLabel();document.addEventListener('languagechange',updateNewPostsLabel);
  window.syncShagramNewPosts=()=>{refresh.hidden=true;};
  let checkingNewPosts=false;
  const checkNewPosts=async()=>{
    if(document.hidden||checkingNewPosts||!window.shagramRenderedPostIds)return;
    checkingNewPosts=true;
    try{const data=await request('/api/media/posts');refresh.hidden=!data.posts.some(post=>!window.shagramRenderedPostIds.has(post.id));}catch{/* Retry on the next check without disturbing the feed. */}finally{checkingNewPosts=false;}
  };
  setInterval(checkNewPosts,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNewPosts();});
  const profileSummary=document.createElement('button');profileSummary.type='button';profileSummary.className='shagram-inline-profile';profileSummary.hidden=true;profileSummary.onclick=()=>own.click();
  window.refreshShagramProfileSummary=async()=>{
    if(!viewer){profileSummary.hidden=true;own.hidden=true;return;}
    own.hidden=false;
    try{const data=await request(`/api/media/profile?accountId=${encodeURIComponent(viewer.id)}`);profileSummary.replaceChildren();
      const name=document.createElement('strong');name.textContent=data.name;name.translate=false;profileSummary.append(name);
      if(data.bio){const bio=document.createElement('span');bio.textContent=data.bio;bio.translate=false;profileSummary.append(bio);}
      const counts=document.createElement('small');
      for(const [key,label] of [['posts','Posts'],['followers','Followers'],['following','Following']]){const stat=document.createElement('span');const number=document.createElement('b');number.textContent=data.counts[key]+' ';const caption=document.createElement('span');caption.textContent=label;stat.append(number,caption);counts.append(stat);}
      profileSummary.append(counts);profileSummary.hidden=false;
    }catch{profileSummary.hidden=true;}
  };
  composerActions.append(own,profileSummary);
  document.querySelector('#postComposer').before(composerActions);
  window.refreshShagramProfileSummary();

  window.openShagramImageEditor = async (file, index) => {
    const dialog = modal('Edit image');
    const stage = document.createElement('div'); stage.className = 'shagram-image-stage'; dialog.append(stage);
    const canvas = document.createElement('canvas'); canvas.className = 'shagram-edit-canvas'; stage.append(canvas);
    const url = URL.createObjectURL(file); const image = new Image();
    dialog.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
    image.src = url;
    try { await image.decode(); } catch { dialog.close(); return; }
    if (!dialog.isConnected) return;
    const form = document.createElement('form'); form.className = 'shagram-edit-controls';
    form.append(stage);
    const toolbar = document.createElement('div'); toolbar.className = 'shagram-editor-toolbar'; toolbar.setAttribute('role','toolbar'); toolbar.setAttribute('aria-label','Image editing tools'); stage.append(toolbar);
    const toolPanels=[];
    const state = { brightness: 100, contrast: 100, saturation: 100, zoom: 1, x: 50, y: 50, frame: 'none' };
    const stickers = []; let active = null;
    function removeSelectedSticker() {
      if (!active) return;
      const selectedIndex = stickers.indexOf(active);
      if (selectedIndex !== -1) stickers.splice(selectedIndex, 1);
      selectSticker(null);
    }
    const deleteSticker = iconButton(toolbar,'🗑️','Remove selected sticker',removeSelectedSticker);
    deleteSticker.hidden = true;
    const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = '✓'; apply.className = 'shagram-apply-icon'; apply.title = 'Apply edits'; apply.setAttribute('aria-label','Apply edits'); apply.disabled = true; apply.hidden = true;
    apply.onclick = () => form.requestSubmit();
    const initialEdits = JSON.stringify({state,stickers,music:musicSelect.value});
    function updateApply(){apply.disabled=JSON.stringify({state,stickers,music:musicSelect.value})===initialEdits;apply.hidden=apply.disabled;}
    musicSelect.addEventListener('change',updateApply);
    dialog.addEventListener('close',()=>musicSelect.removeEventListener('change',updateApply),{once:true});
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Drag stickers to position them. Arrow keys move the selected sticker.');
    const ratio = selectedMediaAspect === '9:16' ? 9 / 16 : 16 / 9;
    canvas.width = ratio < 1 ? 720 : 1280; canvas.height = ratio < 1 ? 1280 : 720;
    function draw(exporting = false) {
      if(!exporting)updateApply();
      const ctx = canvas.getContext('2d');
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * state.zoom;
      const sw = canvas.width / scale, sh = canvas.height / scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
      ctx.drawImage(image, (image.width - sw) * state.x / 100, (image.height - sh) * state.y / 100, sw, sh, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      if (state.frame !== 'none') {
        ctx.lineWidth = 30; ctx.strokeStyle = '#ffd700';
        if (state.frame.startsWith('#')) ctx.strokeStyle = state.frame;
        if (state.frame === 'rainbow') { const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); ['#ff5252','#ffc107','#4caf50','#448aff','#ab47bc'].forEach((c, i) => gradient.addColorStop(i / 4, c)); ctx.strokeStyle = gradient; }
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
        const decoration = {flowers:'🌸',hearts:'💖',diwali:'🪔',party:'🎉',stars:'⭐',holi:'🌈',marigold:'🌼',funny:'😂',wedding:'🌹',sparkles:'✨'}[state.frame];
        if (decoration) {
          ctx.font = '38px "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (let x=28;x<canvas.width;x+=64) {ctx.fillText(decoration,x,28);ctx.fillText(decoration,x,canvas.height-28);}
          for (let y=92;y<canvas.height-50;y+=64) {ctx.fillText(decoration,28,y);ctx.fillText(decoration,canvas.width-28,y);}
        }
      }
      for (const sticker of stickers) {
        ctx.save(); ctx.translate(sticker.x,sticker.y); ctx.rotate(sticker.rotation*Math.PI/180);
        ctx.font = `${sticker.size}px "Segoe UI Emoji", sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        if (sticker.glyph === 'moustache') {
          ctx.fillStyle=sticker.color; ctx.scale(sticker.size/100,sticker.size/100);
          ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-20,-28,-30,22,-50,-6);ctx.bezierCurveTo(-52,34,-12,30,0,12);ctx.bezierCurveTo(12,30,52,34,50,-6);ctx.bezierCurveTo(30,22,20,-28,0,0);ctx.fill();
        } else if(sticker.text) {
          ctx.font=`${sticker.italic?'italic ':''}${sticker.bold!==false?'bold ':''}${sticker.size/4}px ${sticker.font||'sans-serif'}`;ctx.fillStyle=sticker.color;ctx.strokeStyle=sticker.outlineColor||'#000000';ctx.lineWidth=2;
          if(sticker.outline!==false)ctx.strokeText(sticker.glyph,0,0,sticker.size);ctx.fillText(sticker.glyph,0,0,sticker.size);
        } else ctx.fillText(sticker.glyph,0,0);
        ctx.restore();
        if (!exporting && sticker===active) {
          ctx.save();ctx.translate(sticker.x,sticker.y);ctx.rotate(sticker.rotation*Math.PI/180);ctx.strokeStyle='#6366f1';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.strokeRect(-sticker.size/2,-sticker.size/2,sticker.size,sticker.size);
          ctx.setLineDash([]);ctx.fillStyle='#ffffff';
          const handle=12*canvas.width/(canvas.getBoundingClientRect().width||canvas.width);
          for(const dx of [-1,1]) for(const dy of [-1,1]) {const x=dx*sticker.size/2,y=dy*sticker.size/2;ctx.fillRect(x-handle/2,y-handle/2,handle,handle);ctx.strokeRect(x-handle/2,y-handle/2,handle,handle);}
          ctx.restore();
        }
      }
    }
    function section(icon, label, open=false) {
      const panel=document.createElement('div');panel.className='shagram-tool-panel';panel.hidden=true;
      const button=iconButton(toolbar,icon,label,()=>{
        const opening=panel.hidden;
        toolPanels.forEach(([p,b])=>{p.hidden=true;b.setAttribute('aria-pressed','false');});
        panel.hidden=!opening;button.setAttribute('aria-pressed',String(opening));
        if(label!=='Music'||!opening)preview.pause();
      });
      button.setAttribute('aria-pressed','false');toolPanels.push([panel,button]);stage.append(panel);return panel;
    }
    function iconButton(parent, icon, label, action) {
      const button=document.createElement('button');button.type='button';button.textContent=icon;button.title=label;button.setAttribute('aria-label',label);button.onclick=action;parent.append(button);return button;
    }
    const adjust=section('🎨','Adjust');
    const adjustmentOptions=[['brightness','Brightness','☀️',50,150,1],['contrast','Contrast','◐',50,150,1],['saturation','Colour','🌈',0,200,1],['zoom','Crop zoom','🔍',1,3,0.05],['x','Horizontal position','↔',0,100,1],['y','Vertical position','↕',0,100,1]];
    const adjustmentBar=document.createElement('div');adjustmentBar.className='shagram-adjust-icons';adjustmentBar.setAttribute('role','group');adjustmentBar.setAttribute('aria-label','Adjust');adjust.append(adjustmentBar);
    const adjustmentLabel=document.createElement('label');const adjustmentCaption=document.createElement('span');const adjustmentValue=document.createElement('output');adjustmentValue.translate=false;
    const adjustmentInput=document.createElement('input');adjustmentInput.type='range';
    adjustmentLabel.append(adjustmentCaption,adjustmentInput,adjustmentValue);adjust.append(adjustmentLabel);
    let currentAdjustment=adjustmentOptions[0];const adjustmentButtons=[];
    function showAdjustment(option){currentAdjustment=option;const [key,label,,min,max,step]=option;adjustmentCaption.textContent=label;Object.assign(adjustmentInput,{min,max,step,value:state[key]});adjustmentInput.setAttribute('aria-label',label);adjustmentValue.textContent=key==='zoom'?state[key].toFixed(2)+'×':state[key]+'%';adjustmentButtons.forEach(([b,k])=>b.setAttribute('aria-pressed',String(k===key)));}
    for(const option of adjustmentOptions){const button=iconButton(adjustmentBar,option[2],option[1],()=>showAdjustment(option));adjustmentButtons.push([button,option[0]]);}
    adjustmentInput.oninput=()=>{state[currentAdjustment[0]]=Number(adjustmentInput.value);showAdjustment(currentAdjustment);draw();};
    iconButton(adjustmentBar,'↺','Reset adjustments',()=>{Object.assign(state,{brightness:100,contrast:100,saturation:100,zoom:1,x:50,y:50});showAdjustment(currentAdjustment);draw();});
    showAdjustment(currentAdjustment);
    const stickerPanel=section('😎','Stickers',true);
    stickerPanel.classList.add('shagram-floating-stickers');stage.append(stickerPanel);
    function closeStickerPicker(){stickerPanel.hidden=true;const entry=toolPanels.find(([panel])=>panel===stickerPanel);entry[1].setAttribute('aria-pressed','false');canvas.focus({preventScroll:true});}
    function selectSticker(sticker) { active=sticker;deleteSticker.hidden=!sticker;if(sticker?.text)syncTextControls();draw(); }
    const palette=document.createElement('div');palette.className='sticker-palette sticker-palette-all';stickerPanel.append(palette);
    const seenStickers=new Set();
    for (const [,glyphs] of [
      ['Funny','😎 😂 🤣 😍 🤪 😜 🥳 🤡 👻 👽 🤖 💩 🙈 🐵 🐸 🦄 🔥 💯 💥'],
      ['Style','🕶️ 👓 👑 🎩 🧢 🎀 👒 🎓 💇 🦱 🦰 🦳 🦲 👗 👘 🥻 👔 👕 🧥 👚 👢 👟'],
      ['Festive','🪔 🌼 🌸 🌺 🌹 🏵️ 🌈 🎆 🎇 🎉 🎊 🎈 🪷 🙏 🛕 🥥 🥁 🪘 🦚 🐘 💃 🕺'],
      ['Seasons','☀️ 🌞 🌻 🏖️ 🌊 🍉 🥭 🌧️ ☔ 🌦️ 🌈 🍁 🍂 🍃 🌱 🌷 ❄️ ☃️ ⛄ 🧣 🧤'],
      ['Indian celebrations','🇮🇳 🦚 🪷 🕊️ 🎖️ 🏅 🫡 🎉 🎆 🪁 🌾 🥥 🪔 🛕 🌙 ⭐ 🎄 🎅 🔔 🎁'],
      ['Love','❤️ 💖 💕 💝 💋 🥰 ⭐ ✨ 🌟 💫 🦋 🌻 🍀 🎁 🎂 🍰 🍭 🍬']]) {
      for (const glyph of glyphs.split(' ')) {
        if(seenStickers.has(glyph))continue;seenStickers.add(glyph);
        iconButton(palette,glyph,glyph,()=>{const sticker={glyph,x:canvas.width/2,y:canvas.height/2,size:120,rotation:0};stickers.push(sticker);selectSticker(sticker);closeStickerPicker();});
      }
    }
    const accessories=palette;
    for(const color of ['#24160e','#7b3f00','#ef4444','#7c3aed','#ffffff']) {const b=iconButton(accessories,'〰','Moustache '+color,()=>{const sticker={glyph:'moustache',color,x:canvas.width/2,y:canvas.height/2,size:140,rotation:0};stickers.push(sticker);selectSticker(sticker);closeStickerPicker();});b.style.color=color;}
    const frames=section('🖼️','Frames');const framePalette=document.createElement('div');framePalette.className='sticker-palette';frames.append(framePalette);
    const frameButtons=[];
    for(const [value,icon,label] of [['none','🚫','None'],['rainbow','🌈','Rainbow'],['#ffffff','⬜','White'],['#ff69b4','🩷','Pink'],['#ffd700','🟨','Gold'],['flowers','🌸','Flowers'],['hearts','💖','Hearts'],['diwali','🪔','Diwali'],['party','🎉','Party'],['stars','⭐','Stars'],['holi','🌈','Holi'],['marigold','🌼','Marigold'],['funny','😂','Funny'],['wedding','🌹','Wedding'],['sparkles','✨','Sparkles']]) {
      const b=iconButton(framePalette,icon,label,()=>{state.frame=value;frameButtons.forEach(([button,v])=>button.setAttribute('aria-pressed',String(v===value)));draw();});b.setAttribute('aria-pressed',String(value==='none'));frameButtons.push([b,value]);
    }
    function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
    let drag=null;
    canvas.onpointerdown=e=>{
      const p=point(e), tolerance=16*canvas.width/(canvas.getBoundingClientRect().width||canvas.width);
      const angle=(active?.rotation||0)*Math.PI/180;
      const local=active?{x:(p.x-active.x)*Math.cos(angle)+(p.y-active.y)*Math.sin(angle),y:-(p.x-active.x)*Math.sin(angle)+(p.y-active.y)*Math.cos(angle)}:null;
      if(active && [-1,1].some(dx=>[-1,1].some(dy=>Math.hypot(local.x-dx*active.size/2,local.y-dy*active.size/2)<=tolerance))) {
        drag={id:e.pointerId,resize:true,start:Math.hypot(p.x-active.x,p.y-active.y),size:active.size,angle:Math.atan2(p.y-active.y,p.x-active.x),rotation:active.rotation};
      } else {
        const hit=[...stickers].reverse().find(s=>Math.hypot(p.x-s.x,p.y-s.y)<s.size*.7);selectSticker(hit||null);
        if(hit)drag={id:e.pointerId,x:p.x-hit.x,y:p.y-hit.y};
      }
      if(drag){canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);e.preventDefault();}
    };
    canvas.onpointermove=e=>{
      if(!drag||!active||drag.id!==e.pointerId)return;const p=point(e);
      if(drag.resize){active.size=Math.max(40,Math.min(400,drag.size*Math.hypot(p.x-active.x,p.y-active.y)/Math.max(1,drag.start)));active.rotation=drag.rotation+(Math.atan2(p.y-active.y,p.x-active.x)-drag.angle)*180/Math.PI;}
      else {active.x=Math.max(0,Math.min(canvas.width,p.x-drag.x));active.y=Math.max(0,Math.min(canvas.height,p.y-drag.y));}
      if(active.text)syncTextControls();draw();
    };
    canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
    canvas.onkeydown=e=>{if(!active)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelectedSticker();return;}const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(moves[e.key]){e.preventDefault();active.x=Math.max(0,Math.min(canvas.width,active.x+moves[e.key][0]));active.y=Math.max(0,Math.min(canvas.height,active.y+moves[e.key][1]));draw();}};
    const textPanel=section('T','Text');
    const textInput=document.createElement('input');textInput.type='text';textInput.maxLength=80;textInput.placeholder='Add text';textInput.setAttribute('aria-label','Add text');
    const textColor=document.createElement('input');textColor.type='color';textColor.value='#ffffff';textColor.setAttribute('aria-label','Text colour');
    textPanel.append(textInput);
    const textOptions=document.createElement('div');textOptions.className='shagram-text-options';textPanel.append(textOptions);
    function textControl(label,input){const wrapper=document.createElement('label');const caption=document.createElement('span');caption.textContent=label;input.setAttribute('aria-label',label);wrapper.append(caption,input);textOptions.append(wrapper);}
    textControl('Text colour',textColor);
    const fontSelect=document.createElement('select');
    for(const [value,label] of [['sans-serif','Sans serif'],['serif','Serif'],['monospace','Monospace'],['cursive','Handwriting'],['Georgia, serif','Georgia'],['Arial, sans-serif','Arial']]) {const option=document.createElement('option');option.value=value;option.textContent=label;fontSelect.append(option);}
    textControl('Font',fontSelect);
    const fontSize=document.createElement('input');Object.assign(fontSize,{type:'number',min:10,max:100,step:1,value:75});textControl('Font size',fontSize);
    const outlineColor=document.createElement('input');outlineColor.type='color';outlineColor.value='#000000';textControl('Outline colour',outlineColor);
    const textFlags={bold:true,italic:false,outline:true};const flagButtons={};
    for(const [key,icon,label] of [['bold','B','Bold'],['italic','𝘐','Italic'],['outline','◯','Outline']]) {
      const button=iconButton(textOptions,icon,label,()=>{textFlags[key]=!textFlags[key];button.setAttribute('aria-pressed',String(textFlags[key]));if(active?.text){active[key]=textFlags[key];draw();}});button.setAttribute('aria-pressed',String(textFlags[key]));flagButtons[key]=button;
    }
    function syncTextControls(){textInput.value=active.glyph;textColor.value=active.color;fontSelect.value=active.font||'sans-serif';fontSize.value=Math.round(active.size/4);outlineColor.value=active.outlineColor||'#000000';for(const key of Object.keys(textFlags)){textFlags[key]=key==='italic'?!!active[key]:active[key]!==false;flagButtons[key].setAttribute('aria-pressed',String(textFlags[key]));}}
    fontSelect.onchange=()=>{if(active?.text){active.font=fontSelect.value;draw();}};
    fontSize.oninput=()=>{if(!fontSize.value)return;const value=Math.max(10,Math.min(100,Number(fontSize.value)));if(active?.text&&Number.isFinite(value)){active.size=value*4;draw();}};
    outlineColor.oninput=()=>{if(active?.text){active.outlineColor=outlineColor.value;draw();}};
    iconButton(textPanel,'＋','Add text',()=>{if(!textInput.value.trim())return;const sticker={text:true,glyph:textInput.value.trim(),color:textColor.value,font:fontSelect.value,outlineColor:outlineColor.value,...textFlags,x:canvas.width/2,y:canvas.height/2,size:Math.max(10,Math.min(100,Number(fontSize.value)||75))*4,rotation:0};stickers.push(sticker);selectSticker(sticker);});
    textInput.oninput=()=>{if(active?.text){active.glyph=textInput.value;draw();}};
    textColor.oninput=()=>{if(active?.text){active.color=textColor.value;draw();}};
    const musicPanel=section('🎵','Music');musicPanel.append(musicBox);
    dialog.addEventListener('close',()=>{preview.pause();musicEditor.append(musicBox);},{once:true});
    toolbar.append(deleteSticker,apply);
    form.onsubmit = event => {
      event.preventDefault(); if(apply.disabled)return; apply.disabled = true; draw(true);
      canvas.toBlob(blob => {
        if (!blob) { apply.disabled = false; draw(); return; }
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
