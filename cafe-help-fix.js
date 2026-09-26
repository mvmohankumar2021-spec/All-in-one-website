(() => {
  const panel=document.querySelector('.cafe-onboarding');if(!panel)return;
  const tip=document.createElement('div');tip.className='bakery-help-tooltip';tip.hidden=true;document.body.append(tip);
  panel.querySelectorAll('.plumbing-help-button').forEach(button=>{button.onclick=event=>{event.preventDefault();event.stopPropagation();const rect=button.getBoundingClientRect();tip.textContent=button.title||button.getAttribute('aria-label')||'Enter the requested details accurately.';tip.style.left=`${Math.max(12,Math.min(window.innerWidth-282,rect.right-270))}px`;tip.style.top=`${Math.min(window.innerHeight-72,rect.bottom+8)}px`;tip.hidden=!tip.hidden};});
  document.addEventListener('click',event=>{if(!event.target.closest('.plumbing-help-button,.bakery-help-tooltip'))tip.hidden=true});
})();
