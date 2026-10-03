window.createCommunities=function(api,refresh,openRoom,error){
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const panel=make('details','');panel.id='communitiesPanel';panel.append(make('summary','♧ Communities'));
  document.querySelector('.chat-list').append(panel);
  const rail=make('button','◎');rail.title='Communities';rail.setAttribute('aria-label','Communities');document.querySelector('.chat-rail').append(rail);
  rail.onclick=()=>{document.body.classList.remove('chat-open');panel.open=true;panel.scrollIntoView({block:'nearest'});};
  function button(host,text,fn){const b=make('button',text);b.type='button';b.onclick=()=>Promise.resolve().then(fn).catch(error);host.append(b);}
  async function act(data){const r=await api(data);document.getElementById('status').textContent=r.message||'';await refresh();}
  function form(host,label,submit,max=80){const f=make('form',''),i=make('input','');i.placeholder=label;i.setAttribute('aria-label',label);i.required=true;i.maxLength=max;const b=make('button',label);f.append(i,b);f.onsubmit=async e=>{e.preventDefault();try{await submit(i.value);i.value='';}catch(x){error(x);}};host.append(f);}
  form(panel,'Create community',name=>act({action:'communityCreate',name}));
  form(panel,'Join with invitation code',code=>act({action:'communityRequest',code}),100);
  panel.append(make('p','Joining requires admin approval. Community members see user IDs only. Linked groups have separate membership and phone-sharing consent.'));
  const list=make('div','');panel.append(list);let previous='';
  return function(state){
    const signature=JSON.stringify(state.communities||[]);if(signature===previous||list.contains(document.activeElement))return;previous=signature;list.replaceChildren();
    for(const c of state.communities||[]){
      const card=make('details','');card.className='community-card';card.append(make('summary',c.name+' · '+c.members.length+' members'));list.append(card);
      const base={community:c.id};
      if(c.admin){card.append(make('p','Invitation code: '+c.code));button(card,'Replace invitation code',()=>act({...base,action:'communityRotate'}));
        for(const q of c.requests){const r=make('p',q.user_id);button(r,'Approve',()=>act({...base,action:'communityApprove',userId:q.user_id}));button(r,'Decline',()=>act({...base,action:'communityReject',userId:q.user_id}));card.append(r);}
        form(card,'Post announcement',body=>act({...base,action:'communityAnnounce',body}),4000);
        form(card,'Link group by room ID',value=>act({...base,action:'communityLink',room:Number(value)}));
        card.append(make('small','Your group room IDs: '+state.rooms.filter(r=>r.kind==='group').map(r=>`${r.title} (${r.id})`).join(', ')));
      } else button(card,'Leave community',()=>act({...base,action:'communityLeave'}));
      card.append(make('h3','Announcements'));
      if(!c.announcements.length)card.append(make('p','No announcements yet.'));
      for(const a of c.announcements){const p=make('p',a.body);p.className='community-announcement';card.append(p);}
      card.append(make('h3','Groups'));
      for(const g of c.groups){const p=make('p',g.title);if(g.joined)button(p,'Open',()=>openRoom(g.id));else p.append(make('small',' — Ask a group admin for an invitation.'));if(c.admin)button(p,'Unlink',()=>act({...base,action:'communityUnlink',room:g.id}));card.append(p);}
      const members=make('details','');members.append(make('summary','Members'));
      for(const m of c.members){const p=make('p',m.userId+(m.admin?' · Admin':''));if(c.admin&&!m.admin){button(p,'Remove',()=>{if(confirm('Remove this member from the community? Group membership is unchanged.'))return act({...base,action:'communityRemove',userId:m.userId});});button(p,'Make owner',()=>{if(confirm('Transfer community ownership to this member? You will become an ordinary member.'))return act({...base,action:'communityTransfer',userId:m.userId});});}members.append(p);}card.append(members);
    }
  };
};
