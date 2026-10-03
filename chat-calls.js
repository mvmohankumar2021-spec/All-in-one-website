/* Local-only WebRTC: no external STUN/TURN, recording, or fake encryption claims. */
window.createChatCalls = function(api, button, error) {
  const $=id=>document.getElementById(id);
  let active=null, pc=null, stream=null, working=false, baseline=null;
  const seen=new Set();
  function notify(text) { try { if('Notification' in window && Notification.permission==='granted' && document.hidden) new Notification('Shachat',{body:text,tag:'shakalpa-chat'}); } catch (_) { /* Some mobile browsers require hosted service-worker notifications. */ } }
  $('notifications').onclick=async()=>{if(!('Notification' in window)){error(Error('Notifications are unavailable in this browser.'));return;} const p=await Notification.requestPermission();$('notifications').textContent=p==='granted'?'Local notifications enabled':'Notifications not enabled';};
  function clean(){if(pc)pc.close();if(stream)stream.getTracks().forEach(t=>t.stop());pc=null;stream=null;active=null;$('localCall').srcObject=null;$('remoteCall').srcObject=null;$('callPanel').hidden=true;}
  async function end(){const c=active;clean();if(c)await api({action:'endCall',room:c.room,id:c.id});}
  async function prepare(video){
    if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)throw Error('This browser does not support local calls. Try a supported browser on localhost.');
    stream=await navigator.mediaDevices.getUserMedia({audio:true,video});
    $('localCall').srcObject=stream;
    pc=new RTCPeerConnection({iceServers:[]});
    stream.getTracks().forEach(t=>pc.addTrack(t,stream));
    pc.ontrack=e=>{$('remoteCall').srcObject=e.streams[0];$('remoteCall').play().catch(()=>{$('callStatus').textContent='Press play to hear the call.';});};
    pc.onconnectionstatechange=()=>{if(!pc)return;$('callStatus').textContent='Call: '+pc.connectionState;if(pc.connectionState==='failed')end().catch(error);};
  }
  async function description(d){
    await pc.setLocalDescription(d);
    const current=pc;
    if(current.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{current.removeEventListener('icegatheringstatechange',check);reject(Error('Connection preparation timed out. Try again.'));},10000);function check(){if(current.iceGatheringState==='complete'){clearTimeout(timer);current.removeEventListener('icegatheringstatechange',check);resolve();}}current.addEventListener('icegatheringstatechange',check);check();});
    return {type:current.localDescription.type,sdp:current.localDescription.sdp};
  }
  function panel(text){$('callPanel').hidden=false;$('callStatus').textContent=text;$('callButtons').replaceChildren();if(!working)button($('callButtons'),'End call',end);}
  async function start(room,video){
    if(working||active)throw Error('Finish your current call first.');working=true;
    try{panel('Preparing local call…');await prepare(video);const offer=await description(await pc.createOffer());const r=await api({action:'call',room,video,description:offer});active={id:r.id,room};working=false;panel('Calling… (expires after 60 seconds)');}catch(e){clean();throw e;}finally{working=false;}
  }
  async function accept(c){
    if(working)return;working=true;
    try{active=c;panel('Connecting…');await prepare(c.video);await pc.setRemoteDescription(c.offer);const answer=await description(await pc.createAnswer());await api({action:'answerCall',id:c.id,room:c.room,description:answer});working=false;panel('Connecting…');}catch(e){await end().catch(()=>{});throw e;}finally{working=false;}
  }
  async function update(state){
    const unread=state.rooms.reduce((n,r)=>n+r.unread,0)+state.invites.length+state.groupInvites.length;
    if(baseline!==null&&unread>baseline)notify('You have new messages or invitations.');baseline=unread;
    if(working)return;
    if(active){const c=state.calls.find(c=>c.id===active.id);if(!c){clean();return;}if(c.answer&&pc&&!pc.remoteDescription)await pc.setRemoteDescription(c.answer);return;}
    const c=state.calls.find(c=>c.incoming&&c.status==='ringing');
    if(c){active=c;panel((c.video?'Video':'Audio')+' call from '+c.userId);$('callButtons').replaceChildren();button($('callButtons'),'Accept',()=>accept(c));button($('callButtons'),'Decline',end);if(!seen.has(c.id)){seen.add(c.id);notify('Incoming call');}}
  }
  window.addEventListener('pagehide',()=>{const c=active;clean();if(c)fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'endCall',room:c.room,id:c.id}),keepalive:true}).catch(()=>{});});
  return {start,update,stop:clean};
};
