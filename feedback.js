(() => {
  if(document.getElementById('feedbackLauncher'))return;
  const words={
    'Feedback':['கருத்து','प्रतिक्रिया'],'User Feedback':['பயனர் கருத்துகள்','उपयोगकर्ता प्रतिक्रिया'],
    'My feedback':['எனது கருத்துகள்','मेरी प्रतिक्रियाएँ'],'Close':['மூடு','बंद करें'],'Submit feedback':['கருத்தை அனுப்பு','प्रतिक्रिया भेजें'],
    'Title':['தலைப்பு','शीर्षक'],'Description':['விவரம்','विवरण'],'Category':['வகை','श्रेणी'],
    'Bug':['பிழை','समस्या'],'Improvement':['மேம்பாடு','सुधार'],'New feature':['புதிய வசதி','नई सुविधा'],'General feedback':['பொதுக் கருத்து','सामान्य प्रतिक्रिया'],
    'New':['புதியது','नया'],'Under review':['ஆய்வில் உள்ளது','समीक्षाधीन'],'Planned':['திட்டமிடப்பட்டது','नियोजित'],'In progress':['செயல்பாட்டில்','कार्य प्रगति पर'],'Completed':['முடிந்தது','पूर्ण'],'Not planned':['திட்டத்தில் இல்லை','योजना में नहीं'],
    'Status':['நிலை','स्थिति'],'Reply':['பதில்','उत्तर'],'Save review':['மதிப்பாய்வைச் சேமி','समीक्षा सहेजें'],
    'Merge into reference':['இந்த குறிப்பு எண்ணுடன் இணைக்கவும்','इस संदर्भ में मिलाएँ'],'Merge duplicates':['நகல் கருத்துகளை இணை','समान प्रतिक्रियाएँ मिलाएँ'],
    'Unique users':['தனித்த பயனர்கள்','अलग उपयोगकर्ता'],'Reference':['குறிப்பு எண்','संदर्भ'],
    'No feedback yet.':['இன்னும் கருத்துகள் இல்லை.','अभी कोई प्रतिक्रिया नहीं।'],
    'Loading feedback…':['கருத்துகள் ஏற்றப்படுகின்றன…','प्रतिक्रियाएँ लोड हो रही हैं…'],
    'Search feedback':['கருத்துகளைத் தேடு','प्रतिक्रिया खोजें'],
    'Thank you for your valuable feedback. Your suggestion helps us improve SHAKALPA.':['உங்கள் மதிப்புமிக்க கருத்துக்கு நன்றி. உங்கள் ஆலோசனை SHAKALPA-வை மேம்படுத்த உதவுகிறது.','आपकी बहुमूल्य प्रतिक्रिया के लिए धन्यवाद। आपका सुझाव SHAKALPA को बेहतर बनाने में मदद करता है।'],
    'Feedback updated.':['கருத்து புதுப்பிக்கப்பட்டது.','प्रतिक्रिया अपडेट की गई।'],
    'Feedback combined. Each user is counted once.':['கருத்துகள் இணைக்கப்பட்டன. ஒவ்வொரு பயனரும் ஒருமுறை எண்ணப்படுவர்.','प्रतिक्रियाएँ मिला दी गईं। प्रत्येक उपयोगकर्ता को एक बार गिना जाता है।'],
    'Similar feedback combined.':['ஒத்த கருத்துகள் இணைக்கப்பட்டன.','समान प्रतिक्रियाएँ मिलाई गईं।'],
    'Only authorized staff can view your full submission.':['அங்கீகரிக்கப்பட்ட ஊழியர்கள் மட்டுமே உங்கள் முழுக் கருத்தைப் பார்க்க முடியும்.','केवल अधिकृत कर्मचारी आपकी पूरी प्रतिक्रिया देख सकते हैं।'],
    'Combine these feedback items? Original submissions will be preserved.':['இந்தக் கருத்துகளை இணைக்கவா? அசல் கருத்துகள் பாதுகாக்கப்படும்.','इन प्रतिक्रियाओं को मिलाएँ? मूल विवरण सुरक्षित रहेंगे।'],
    'Feedback unavailable.':['கருத்து கிடைக்கவில்லை.','प्रतिक्रिया उपलब्ध नहीं है।'],
    'Enter a title, category and description within the limits.':['வரம்புகளுக்குள் தலைப்பு, வகை மற்றும் விவரத்தை உள்ளிடவும்.','सीमा के भीतर शीर्षक, श्रेणी और विवरण दर्ज करें।'],
    'Feedback limit reached. Please try again later.':['கருத்து வரம்பு எட்டப்பட்டது. பின்னர் முயற்சிக்கவும்.','प्रतिक्रिया सीमा पूरी हुई। बाद में प्रयास करें।'],
    'Choose a valid status and a reply up to 2,000 characters.':['சரியான நிலையையும் 2,000 எழுத்துகளுக்குள் பதிலையும் தேர்ந்தெடுக்கவும்.','मान्य स्थिति और 2,000 अक्षरों तक का उत्तर चुनें।'],
    'Explain why this feedback is not planned.':['இது ஏன் திட்டத்தில் இல்லை என்பதை விளக்கவும்.','बताएँ कि यह योजना में क्यों नहीं है।'],
    'Choose a different active feedback reference.':['வேறு செயலில் உள்ள கருத்து எண்ணைத் தேர்ந்தெடுக்கவும்.','दूसरा सक्रिय प्रतिक्रिया संदर्भ चुनें।'],
    'Please sign in to use feedback.':['கருத்தைப் பயன்படுத்த உள்நுழையவும்.','प्रतिक्रिया के लिए साइन इन करें।'],
    'Could not load feedback. Please try again.':['கருத்துகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.','प्रतिक्रिया लोड नहीं हुई। फिर प्रयास करें।']
  };
  const t=s=>words[s]?.[document.documentElement.lang.startsWith('ta')?0:document.documentElement.lang.startsWith('hi')?1:2]||s;
  const el=(tag,text)=>{const n=document.createElement(tag);n.setAttribute('translate','no');if(text){n.textContent=t(text);n.dataset.feedbackText=text;}return n;};
  async function api(data){const r=await fetch('/api/feedback',data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Could not load feedback. Please try again.');const result=await r.json();if(!r.ok)throw Error(result.error);return result;}
  fetch('/api/session').then(r=>r.json()).then(session=>{
    const role=session.account?.role;if(!session.authenticated||session.adminView||!['Admin','Employee','Customer','Vendor','Agent'].includes(role))return;
    const staff=['Admin','Employee'].includes(role),launcher=el('button',staff?'User Feedback':'Feedback');launcher.id='feedbackLauncher';launcher.type='button';launcher.className=staff?'feedback-staff-link':'feedback-floating';
    if(staff) (document.querySelector('.admin-nav,.admin-actions')||document.querySelector('footer')).append(launcher);
    else {launcher.setAttribute('aria-label',t('Feedback'));launcher.title=t('Feedback');document.body.append(launcher);}
    const footerLink=staff?el('button','User Feedback'):launcher;footerLink.type='button';if(staff){footerLink.className='feedback-footer-link';if(!launcher.closest('footer'))document.querySelector('footer')?.append(footerLink);}
    const profileObserver=new MutationObserver(()=>{const pop=document.querySelector('.account-profile-popover');if(pop&&!pop.querySelector('[data-feedback-profile]')){const b=el('button',staff?'User Feedback':'Feedback');b.type='button';b.dataset.feedbackProfile='true';b.onclick=open;pop.append(b);}});profileObserver.observe(document.body,{childList:true,subtree:true});
    const dialog=el('dialog');dialog.className='feedback-dialog';dialog.setAttribute('aria-labelledby','feedbackHeading');
    const heading=el('h2',staff?'User Feedback':'Feedback');heading.id='feedbackHeading';const close=el('button','Close');close.type='button';close.className='feedback-close';close.onclick=()=>dialog.close();
    const status=el('p');status.setAttribute('role','status');const list=el('div');list.className='feedback-list';dialog.append(close,heading,status);document.body.append(dialog);
    function field(form,label,kind='input',values=[]){const wrap=el('label',label),input=el(kind);if(kind==='select')values.forEach(value=>{const o=el('option',value);o.value=value;input.append(o);});wrap.append(input);form.append(wrap);return input;}
    async function send(data){const r=await api(data);status.replaceChildren(el('span',r.message));if(r.reference){status.append(document.createTextNode(' '),el('span','Reference'),document.createTextNode(': #'+r.reference));}await load();return r;}
    if(!staff){const form=el('form');form.append(el('p','Only authorized staff can view your full submission.'));const category=field(form,'Category','select',['Bug','Improvement','New feature','General feedback']);const title=field(form,'Title');title.required=true;title.minLength=3;title.maxLength=120;const body=field(form,'Description','textarea');body.required=true;body.minLength=5;body.maxLength=4000;const submit=el('button','Submit feedback');form.append(submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await send({action:'submit',category:category.value,title:title.value,body:body.value});form.reset();}catch(x){status.textContent=t(x.message);}finally{submit.disabled=false;}};dialog.append(form,el('h3','My feedback'));}
    const search=el('input');search.type='search';search.placeholder=t('Search feedback');search.setAttribute('aria-label',t('Search feedback'));dialog.append(search,list);let topics=[];
    function render(){search.hidden=topics.length===0;list.replaceChildren();const filtered=topics.filter(f=>(f.title+' '+f.category+' '+f.status).toLowerCase().includes(search.value.toLowerCase()));if(!filtered.length)list.append(el('p','No feedback yet.'));
      filtered.forEach(f=>{const card=el('details'),sum=el('summary');sum.textContent=`#${f.id} · ${f.title}`;sum.dataset.preserveUserName='true';card.append(sum);const meta=el('p');meta.append(el('span',f.category),document.createTextNode(' · '),el('span',f.status),document.createTextNode(' · '),el('span','Unique users'),document.createTextNode(': '+f.count));card.append(meta);
        if(!staff)card.append(el('p','Thank you for your valuable feedback. Your suggestion helps us improve SHAKALPA.'));
        for(const entry of f.entries){const p=el('p');p.textContent=entry.body;p.dataset.preserveUserName='true';p.className='feedback-body';card.append(p);}
        if(f.reply){const p=el('p');p.textContent=f.reply;p.dataset.preserveUserName='true';card.append(el('strong','Reply'),p);}
        f.events.forEach(event=>{const p=el('small',event.message);p.append(document.createTextNode(' · '+new Date(event.created*1000).toLocaleString(document.documentElement.lang)));card.append(p);});
        if(staff){const form=el('form'),select=field(form,'Status','select',['New','Under review','Planned','In progress','Completed','Not planned']),reply=field(form,'Reply','textarea');select.value=f.status;reply.value=f.reply;reply.maxLength=2000;const save=el('button','Save review');form.append(save);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await send({action:'review',topic:f.id,status:select.value,reply:reply.value});}catch(x){status.textContent=t(x.message);save.disabled=false;}};card.append(form);
          const merge=el('form'),target=field(merge,'Merge into reference');target.type='number';target.min=1;target.required=true;merge.append(el('button','Merge duplicates'));merge.onsubmit=async e=>{e.preventDefault();if(!confirm(t('Combine these feedback items? Original submissions will be preserved.')))return;try{await send({action:'merge',topic:f.id,target:Number(target.value)});}catch(x){status.textContent=t(x.message);}};card.append(merge);}
        list.append(card);
      });}
    async function load(){const data=await api();topics=data.topics;render();if(staff){const count=topics.filter(f=>f.status==='New').length;launcher.textContent=t('User Feedback')+(count?' ('+count+')':'');}}
    async function open(){if(!dialog.open)dialog.showModal();status.textContent=t('Loading feedback…');try{await load();status.textContent='';}catch(x){status.textContent=t(x.message);}}
    launcher.onclick=open;footerLink.onclick=open;search.oninput=render;
    document.addEventListener('languagechange',()=>{if(!staff){launcher.setAttribute('aria-label',t('Feedback'));launcher.title=t('Feedback');}});
    document.addEventListener('languagechange',()=>{document.querySelectorAll('[data-feedback-text]').forEach(n=>{const first=n.firstChild;if(first?.nodeType===3)first.textContent=t(n.dataset.feedbackText);});search.placeholder=t('Search feedback');search.setAttribute('aria-label',t('Search feedback'));});
    if(staff)load().catch(()=>{});
  }).catch(()=>{});
})();
