(() => {
  const $ = id => document.getElementById(id);
  let room = null, state, busy = false, failed = false;
  const node = (tag, text) => { const n = document.createElement(tag); n.textContent = text; return n; };
  function button(host, label, fn) { const b = node('button', label); b.type = 'button'; b.onclick = () => Promise.resolve(fn()).catch(error); host.append(b); }
  function error(e) { failed = true; $('status').textContent = e.message; if (!state) $('identity').textContent = e.status === 401 ? 'Sign in to see your Chat ID.' : 'Chat is temporarily unavailable.'; }
  async function api(data) {
    const r = await fetch('/api/chat' + (!data && room ? '?room=' + room : ''), data ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)} : {cache:'no-store'});
    if (!(r.headers.get('Content-Type') || '').includes('application/json')) throw Error('Chat could not connect to the server. Please try again shortly.');
    const result = await r.json();
    if (!r.ok) { const e = Error(result.error || 'Chat unavailable'); e.status = r.status; throw e; }
    return result;
  }
  async function act(data) { const result = await api(data); $('status').textContent = result.message || ''; await refresh(); }
  const calls=window.createChatCalls(api,button,error);
  const renderChannels=window.createChannels(api,refresh,error);
  const renderCommunities=window.createCommunities(api,refresh,async id=>{selectSection('Groups');room=id;document.body.classList.add('chat-open');await refresh();},error);
  // Shared vector style keeps navigation legible across operating systems.
  const railIcons={
    Chats:'<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>',
    Groups:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
    'New chat':'<path d="M14 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8M13 13l-4 1 1-4 9-9 3 3-9 9Z"/>',
    'Chat information':'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    Channels:'<path d="m3 10 13-5v14L3 14v-4ZM6 15l2 6h3l-2-5M20 8l2-2M20 12h3M20 16l2 2"/>',
    Communities:'<rect x="8" y="2" width="8" height="6" rx="2"/><rect x="2" y="16" width="8" height="6" rx="2"/><rect x="14" y="16" width="8" height="6" rx="2"/><path d="M12 8v4M6 16v-4h12v4"/>'
  };
  const railButtons=[...document.querySelectorAll('.chat-rail button')];
  for(const b of railButtons){const label=b.getAttribute('aria-label');if(!railIcons[label])continue;
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+railIcons[label]+'</svg>';
    const caption=node('span',label==='Chat information'?'Info':label==='New chat'?'New':label);b.append(caption);
    b.setAttribute('aria-pressed',String(label==='Chats'));
    b.addEventListener('click',()=>railButtons.forEach(other=>other.setAttribute('aria-pressed',String(other===b))));
  }
  let filter='all';
  function renderRooms(){
    if(!state)return;
    const search=$('chatSearch').value.trim().toLowerCase();
    $('rooms').replaceChildren();
    $('unreadCount').textContent=state.rooms.filter(r=>r.unread>0).length||'';
    state.rooms.filter(r=>(filter!=='unread'||r.unread>0)&&(filter!=='groups'||r.kind==='group')&&r.title.toLowerCase().includes(search)).forEach(r=>{
      const b=node('button','');b.type='button';b.className='chat-row'+(r.id===room?' selected':'');
      b.setAttribute('aria-label',r.title+(r.unread?`, ${r.unread} unread`:''));
      const avatar=node('span',r.kind==='group'?r.icon:r.title.slice(0,1).toUpperCase());avatar.className='chat-avatar';
      const copy=node('span','');copy.className='chat-copy';copy.append(node('strong',r.title),node('small',r.kind==='group'?'Group conversation':'Tap to open conversation'));
      b.append(avatar,copy);if(r.unread){const badge=node('span',r.unread);badge.className='unread-badge';b.append(badge);}
      b.onclick=async()=>{room=r.id;document.body.classList.add('chat-open');try{await refresh();await api({action:'read',room});}catch(e){error(e);}};
      $('rooms').append(b);
    });
    if(!$('rooms').children.length){const empty=node('div','');empty.className='chat-empty';empty.append(node('strong',state.rooms.length?'No matching chats':'Start your first conversation'),node('p',state.rooms.length?'Try another search or filter.':'Use + to invite a friend by their Chat ID.'));$('rooms').append(empty);}
  }
  function setFilter(value){filter=value;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===value)));renderRooms();}
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{selectSection(b.dataset.filter==='groups'?'Groups':'Chats');setFilter(b.dataset.filter);});
  $('chatSearch').oninput=renderRooms;
  function newChat(){selectSection('New chat');$('invite').elements.userId.focus();}
  $('newChat').onclick=newChat;$('showInvite').onclick=newChat;
  $('showChats').onclick=()=>{document.body.classList.remove('chat-open');setFilter('all');};
  $('showGroups').onclick=()=>{document.body.classList.remove('chat-open');setFilter('groups');};
  $('showSettings').onclick=()=>{$('chatSettings').open=!$('chatSettings').open;};
  $('backChats').onclick=()=>document.body.classList.remove('chat-open');
  function selectSection(label){
    const views={Chats:'chats',Groups:'groups','New chat':'new','Chat information':'info',Channels:'channels',Communities:'communities'};
    document.body.dataset.chatSection=views[label]||'chats';
    document.body.classList.remove('chat-open');
    railButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-label')===label)));
    $('chatSettings').open=label==='Chat information';
    $('channelsPanel').open=label==='Channels';
    $('communitiesPanel').open=label==='Communities';
    $('newChatPanel').open=label==='New chat'||label==='Groups';
    $('group').closest('details').open=label==='Groups';
    document.querySelector('.list-heading h2').textContent=label==='Groups'?'Groups':label==='New chat'?'New conversation':'Chats';
    if(label==='Chats'||label==='Groups')setFilter(label==='Groups'?'groups':'all');
  }
  railButtons.forEach(b=>{b.onclick=()=>selectSection(b.getAttribute('aria-label'));});
  $('newChat').onclick=newChat;
  selectSection('Chats');
  async function refresh() {
    if (busy) return; busy = true;
    try {
      state = await api(); $('identity').textContent = 'Your public user ID: ' + state.userId;
      await calls.update(state);
      if (failed) { $('status').textContent = ''; failed = false; }
      renderRooms();
      renderCommunities(state);
      renderChannels(state);
      $('invitationSection').hidden=!(state.invites.length+state.groupInvites.length);
      $('invites').replaceChildren();
      state.invites.forEach(i => { const d = node('div', i.user_id); button(d,'Accept',()=>act({action:'accept',id:i.id})); button(d,'Decline',()=>act({action:'decline',id:i.id})); $('invites').append(d); });
      state.groupInvites.forEach(i => { const d=node('div',i.title); button(d,'Join group',()=> { if(confirm('Share your contact number with current and future admins of this group? Other members see only your user ID.')) return act({action:'join',room:i.id,consent:true}); }); $('invites').append(d); });
      const current=state.rooms.find(r=>r.id===room); $('compose').hidden=!current; $('actions').replaceChildren(); $('members').replaceChildren();
      $('welcome').hidden=!!current;$('messages').hidden=!current;$('memberDetails').hidden=!current;
      if(current) {
        $('roomTitle').textContent=current.title;
        const messages=$('messages'); const nearBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<60;
        messages.replaceChildren(); state.messages.forEach(m=>{const d=node('div',m.body); d.className='message'+(m.mine?' mine':''); d.prepend(node('small',m.userId+' · '+new Date(m.createdAt*1000).toLocaleTimeString())); messages.append(d);}); if(nearBottom) messages.scrollTop=messages.scrollHeight;
        state.members.forEach(m=>$('members').append(node('p',m.userId+(m.admin?' · Admin':'')+(m.phone?' · '+m.phone:''))));
        if(current.kind==='direct') {
          button($('actions'),'☎ Audio call',()=>calls.start(room,false));
          button($('actions'),'▣ Video call',()=>calls.start(room,true));
          button($('actions'),'Block user',async()=>{ const peer=state.members.find(m=>m.userId!==state.userId); if(confirm('Block this user?')) {await api({action:'block',userId:peer.userId});room=null;await refresh();} });
        }
        else {
          if(state.admin){
            button($('actions'),'Add member',()=>groupOptions('members'));
            button($('actions'),'Change group icon',()=>groupOptions('icon'));
          }
          button($('actions'),'Leave group',async()=>{await api({action:'leave',room});room=null;await refresh();});
        }
      } else { $('messages').replaceChildren(); $('roomTitle').textContent='Choose a conversation'; }
    } catch(e) { calls.stop(); throw e; } finally { busy=false; }
  }
  function groupOptions(mode){
    const targetRoom=room,d=document.createElement('dialog');d.className='chat-group-dialog';
    d.append(node('h2',mode==='icon'?'Change group icon':'Add member'));
    const feedback=node('p','');feedback.setAttribute('role','status');d.append(feedback);
    if(mode==='icon'){
      for(const icon of ['👥','🏡','🎓','💼','🛍️','🎉','⚽','🌸','🎵','❤️','🌍','⭐'])button(d,icon,async()=>{try{await act({action:'groupIcon',room:targetRoom,icon});d.close();}catch(e){feedback.textContent=e.message;}});
    }else{
      d.append(node('p','Choose an accepted contact. They must accept the group invitation before joining.'));
      const candidates=state.contacts.filter(c=>!state.members.some(m=>m.userId===c.userId));
      if(!candidates.length)d.append(node('p','No available contacts. Use New to invite a friend by user ID first.'));
      for(const c of candidates)button(d,c.userId,async()=>{try{await api({action:'groupInvite',room:targetRoom,userId:c.userId});feedback.textContent='Group invitation sent.';}catch(e){feedback.textContent=e.message;}});
    }
    button(d,'Close',()=>d.close());d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
  }
  $('invite').onsubmit=async e=>{e.preventDefault();try{await act({action:'invite',userId:e.target.elements.userId.value});}catch(x){error(x);}};
  $('group').onsubmit=async e=>{e.preventDefault();try{const r=await api({action:'group',title:e.target.elements.title.value,consent:e.target.elements.consent.checked});room=r.room;await refresh();}catch(x){error(x);}};
  $('compose').onsubmit=async e=>{e.preventDefault();const input=e.target.elements.body;try{await act({action:'send',room,body:input.value});input.value='';$('messages').scrollTop=$('messages').scrollHeight;}catch(x){error(x);}};
  async function startChat(){
    await refresh();
    const author=new URLSearchParams(location.search).get('author');
    if(!author)return;
    const response=await fetch('/api/chat?author='+encodeURIComponent(author));
    if(!response.ok)throw Error('Could not open this author in Chat.');
    const data=await response.json();
    if(!data.targetUserId){$('status').textContent='This author is not available on Shachat yet.';return;}
    const existing=state.rooms.find(r=>r.kind==='direct'&&r.title===data.targetUserId);
    if(existing){room=existing.id;selectSection('Chats');document.body.classList.add('chat-open');await refresh();}
    else{newChat();$('invite').elements.userId.value=data.targetUserId;$('status').textContent='Send a contact invitation to start chatting. The author must accept first.';}
  }
  startChat().catch(error); setInterval(()=>refresh().catch(error),3000);
})();
