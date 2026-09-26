(() => {
  const panel=document.querySelector('.cafe-onboarding'), form=document.querySelector('#vendorProfileForm'); if(!panel||!form)return;
  const actions=form.querySelector('.profile-actions'), submit=panel.querySelector('.service-final-submit'); let slot=actions?.querySelector('#serviceApprovalSlot');
  if(!slot&&actions){const fallback=actions.querySelector('#submitForApproval');if(fallback){slot=document.createElement('span');slot.id='serviceApprovalSlot';slot._defaultApproval=fallback;fallback.replaceWith(slot);slot.append(fallback)}}
  if(slot&&submit)slot.replaceChildren(submit);
  const availability=document.createElement('section');availability.innerHTML='<h3>Availability</h3><label>Working days <i>*</i><span class="plumbing-days">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<label><input type="checkbox"> ${d}</label>`).join('')+'</span></label><div class="plumbing-grid"><label>Working hours <i>*</i><input placeholder="For example: 8:00 AM – 10:00 PM"></label><label class="plumbing-check"><input type="checkbox"> Urgent order support available</label></div>';
  const agreements=[...panel.querySelectorAll('section')].find(s=>s.querySelector('.plumbing-agreements')); agreements?.before(availability);
  const tip=document.createElement('div');tip.className='bakery-help-tooltip';tip.hidden=true;document.body.append(tip);
  panel.querySelectorAll('label').forEach(label=>{const field=label.querySelector('input,select,textarea');if(!field||field.type==='checkbox'||label.querySelector('.plumbing-help-button'))return;const text=field.placeholder||label.childNodes[0]?.textContent?.trim()||'Enter accurate details.';field.removeAttribute('placeholder');label.classList.add('plumbing-help-label');const b=document.createElement('button');b.type='button';b.className='plumbing-help-button';b.textContent='ⓘ';b.title=text;b.onclick=()=>{tip.textContent=text;tip.hidden=!tip.hidden};label.append(b)});
})();
