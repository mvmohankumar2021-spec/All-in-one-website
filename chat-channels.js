window.createChannels=function(api,refresh,error){
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const panel=make('details','');panel.id='channelsPanel';panel.append(make('summary','◉ Channels'));document.querySelector('.chat-list').append(panel);
  const rail=make('button','◉');rail.title='Channels';rail.setAttribute('aria-label','Channels');document.querySelector('.chat-rail').append(rail);
  rail.onclick=()=>{document.body.classList.remove('chat-open');panel.open=true;panel.scrollIntoView({block:'start'});};
  panel.append(make('p','One-way updates, visible to all signed-in users. Follower identities and phone numbers stay private. Local preview supports text updates.'));
  const search=make('input','');search.type='search';search.placeholder='Search channels';search.setAttribute('aria-label','Search channels');panel.append(search);
  const create=make('details','');create.append(make('summary','＋ Create channel'));panel.append(create);
  const list=make('div','');panel.append(list);let channels=[],signature='';const opened=new Set();
  function button(host,text,fn){const b=make('button',text);b.type='button';b.onclick=()=>Promise.resolve().then(fn).catch(error);host.append(b);return b;}
  async function act(data){await api(data);signature='';await refresh();}
  function form(host,label,submit,max){const f=make('form',''),i=make('textarea','');i.placeholder=label;i.setAttribute('aria-label',label);i.required=true;i.maxLength=max;const b=make('button',label);f.append(i,b);f.onsubmit=async e=>{e.preventDefault();try{await submit(i.value);i.value='';i.blur();render();}catch(x){error(x);}};host.append(f);}
  form(create,'Create channel',name=>act({action:'channelCreate',name}),80);
  function render(){
    list.replaceChildren();const matches=channels.filter(c=>c.name.toLowerCase().includes(search.value.trim().toLowerCase()));
    if(!matches.length)list.append(make('p',channels.length?'No matching channels.':'No channels yet. Create the first one.'));
    for(const c of matches){const card=make('details','');card.className='channel-card';card.open=opened.has(c.id);card.ontoggle=()=>card.open?opened.add(c.id):opened.delete(c.id);
      const summary=make('summary',c.name);summary.append(make('small',` · ${c.followers} followers${c.following?' · Following':''}`));card.append(summary);list.append(card);
      if(c.updates[0]){const preview=make('p',c.updates[0].body.slice(0,100));preview.className='channel-preview';summary.append(preview);}
      button(card,c.following?'Unfollow':'Follow',()=>act({action:c.following?'channelUnfollow':'channelFollow',channel:c.id}));
      if(c.admin)form(card,'Publish update',body=>act({action:'channelPublish',channel:c.id,body}),4000);
      if(!c.updates.length)card.append(make('p','No updates yet.'));
      for(const p of c.updates){const post=make('article','');post.className='channel-post';post.append(make('small',new Date(p.created*1000).toLocaleString()),make('p',p.body));card.append(post);
        for(const emoji of ['👍','❤️','🎉','😂']){const count=p.reactions.find(r=>r.emoji===emoji)?.count||0;const b=button(post,`${emoji} ${count||''}`,()=>act({action:'channelReact',channel:c.id,update:p.id,emoji:p.mine===emoji?null:emoji}));b.disabled=!c.following;b.setAttribute('aria-label',`${emoji}: ${count} reactions`);b.setAttribute('aria-pressed',String(p.mine===emoji));}
      }
    }
  }
  search.oninput=render;
  return state=>{const next=JSON.stringify(state.channels||[]);channels=state.channels||[];if(next===signature||list.querySelector('textarea:focus'))return;signature=next;render();};
};
