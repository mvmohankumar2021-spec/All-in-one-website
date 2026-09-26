(async () => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form) return;
  let schema;
  try {
    const response = await fetch('/meal-schema.json');
    if (!response.ok) throw new Error('Meal service form unavailable');
    schema = await response.json();
  } catch {
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.textContent = 'The meal form could not load. Please reload the page. If this continues, contact support.';
    form.querySelector('.profile-actions')?.before(error);
    return;
  }
  const panel = document.createElement('section');
  panel.className = 'catering-onboarding meal-onboarding'; panel.hidden = true;
  const style = document.createElement('style');
  style.textContent = '.meal-onboarding{grid-column:1/-1;min-width:0;border:1px solid #d7e3ee;border-radius:14px;background:#f8fafc;padding:24px;color:#243c52}.meal-onboarding[hidden]{display:none}.meal-onboarding fieldset{min-width:0;border:0;border-top:1px solid #d7e3ee;padding:20px 0;margin:0}.meal-onboarding legend{font-size:20px;font-weight:700;padding:8px 0}.meal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.meal-field{min-width:0}.meal-field label{display:block;margin-bottom:8px}.meal-field input,.meal-field textarea{box-sizing:border-box;width:100%;min-width:0;min-height:46px}.meal-field details{margin-top:6px}.meal-field summary{cursor:pointer;color:#245577;font-size:13px}.meal-field details p{background:#e8f1fa;padding:12px;border-radius:8px;font-size:14px}.meal-agreement{display:flex!important;align-items:flex-start;gap:10px;margin:12px 0}.meal-agreement input{width:20px!important;min-width:20px;height:20px}.meal-onboarding a{color:#235b7d;text-decoration:underline}.meal-status{white-space:pre-wrap}.meal-status.error{color:#a42218;background:#fff0ed;padding:12px}.meal-onboarding [aria-invalid=true]{outline:2px solid #b42318}@media(max-width:640px){.meal-grid{grid-template-columns:1fr}.meal-onboarding{padding:16px}}';
  document.head.append(style);
  const layout = document.createElement('link');
  layout.rel = 'stylesheet'; layout.href = '/meal-layout.css'; document.head.append(layout);
  style.textContent += '.profile-actions>[hidden],.meal-onboarding [hidden]{display:none!important}';
  const heading = document.createElement('h2'); heading.textContent = 'Meal service partner onboarding'; panel.append(heading);
  const intro = document.createElement('p'); intro.textContent = 'Business name and contact details are taken from your partner profile. Complete only the meal services you selected. * Required for submission.'; panel.append(intro);
  const status = document.createElement('p'); status.className = 'meal-status'; status.setAttribute('role', 'status'); panel.append(status);
  function field(def, host) {
    const [key, title, required, type, help] = def;
    const wrap = document.createElement('div'); wrap.className = 'meal-field';
    const label = document.createElement('label'); label.htmlFor = `meal-${key}`; label.textContent = title + (required ? ' *' : ' (optional)');
    const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type; else input.rows = 3;
    input.id = label.htmlFor; input.dataset.key = key; input.dataset.required = String(required);
    if (type === 'number') { input.min = ['minGuests','maxGuests'].includes(key) ? '1' : '0'; input.max = '100000000'; input.step = ['minGuests','maxGuests','experience'].includes(key) ? '1' : '0.01'; }
    if (['text','textarea'].includes(type)) input.maxLength = 2000;
    if (type === 'textarea') wrap.classList.add('meal-field-wide');
    input.setAttribute('aria-required', String(required));
    const header = document.createElement('div'); header.className = 'meal-field-heading';
    const helpButton = document.createElement('button'); helpButton.type = 'button'; helpButton.className = 'meal-help-button';
    helpButton.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>';
    helpButton.setAttribute('aria-label', `Help for ${title}`);
    helpButton.setAttribute('aria-expanded', 'false');
    const hint = document.createElement('p'); hint.className = 'meal-help-tooltip'; hint.id = `meal-help-${key}`; hint.textContent = help; hint.hidden = true; hint.setAttribute('role', 'tooltip');
    helpButton.setAttribute('aria-controls', hint.id); input.setAttribute('aria-describedby', hint.id);
    header.append(label, helpButton); wrap.append(header, input); host.append(wrap); document.body.append(hint);
  }
  function closeHelp() {
    panel.querySelectorAll('.meal-help-button').forEach(button => button.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.meal-help-tooltip').forEach(hint => hint.hidden = true);
  }
  panel.addEventListener('click', event => {
    const button = event.target.closest('.meal-help-button');
    if (!button) return;
    const open = button.getAttribute('aria-expanded') !== 'true'; closeHelp();
    button.setAttribute('aria-expanded', String(open));
    const hint = document.getElementById(button.getAttribute('aria-controls'));
    hint.hidden = !open;
    if (open) {
      const anchor = button.getBoundingClientRect();
      const box = hint.getBoundingClientRect();
      const left = Math.max(12, Math.min(anchor.left, window.innerWidth - box.width - 12));
      const below = anchor.bottom + 6;
      const top = below + box.height <= window.innerHeight - 12 ? below : Math.max(12, anchor.top - box.height - 6);
      hint.style.left = `${left}px`; hint.style.top = `${top}px`;
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const button = panel.querySelector('.meal-help-button[aria-expanded="true"]');
    if (button) { closeHelp(); button.focus(); event.preventDefault(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.meal-help-button,.meal-help-tooltip')) closeHelp(); });
  window.addEventListener('resize', closeHelp);
  document.addEventListener('scroll', event => { if (!event.target.closest?.('.meal-help-tooltip')) closeHelp(); }, true);
  for (const section of schema.sections) {
    const group = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = section.title;
    const grid = document.createElement('div'); grid.className = 'meal-grid';
    // Pair controls of the same height, preserving their order within each group.
    // DOM order also remains the keyboard order on desktop and mobile.
    for (const definitions of [section.fields.filter(def => def[3] !== 'textarea'), section.fields.filter(def => def[3] === 'textarea')]) {
      for (let index = 0; index < definitions.length; index += 2) {
        const row = document.createElement('div'); row.className = 'meal-field-pair';
        definitions.slice(index, index + 2).forEach(def => field(def, row)); grid.append(row);
      }
    }
    group.append(legend, grid); panel.append(group);
  }
  const specific = document.createElement('fieldset'); specific.innerHTML = '<legend>Selected service details</legend>';
  const serviceGroups = new Map();
  for (const service of schema.services) { const group = document.createElement('div'); field(schema.specific[service], group); specific.append(group); serviceGroups.set(service, group); }
  panel.append(specific);
  const documents = document.createElement('fieldset'); documents.innerHTML = '<legend>Supporting documents</legend><p>Upload current registration/licence proof, menu and price list, kitchen photographs and meal photographs. Existing profile documents remain available; do not upload duplicates.</p><input id="meal-files" type="file" multiple accept="application/pdf,image/jpeg,image/png" aria-label="Select meal supporting documents" hidden><button type="button" class="button button-outline">Choose documents</button><p class="meal-file-status" role="status">PDF, JPEG or PNG; up to 4 files per upload, maximum 1.5 MB each.</p><p><a href="#certificateList">View uploaded profile documents</a></p>';
  panel.append(documents);
  documents.classList.add('meal-documents');
  const uploadedList = document.createElement('ul'); uploadedList.dataset.uploadedDocumentList = ''; documents.append(uploadedList);
  const fileInput = documents.querySelector('input'), upload = documents.querySelector('button'), uploadStatus = documents.querySelector('.meal-file-status');
  const documentHint = document.createElement('p');
  documentHint.id = 'meal-help-documents'; documentHint.className = 'meal-help-tooltip';
  documentHint.setAttribute('role', 'tooltip'); documentHint.hidden = true;
  const uploadGuidance = documents.querySelector(':scope > p');
  documentHint.textContent = `${uploadGuidance.textContent}\n\n${uploadStatus.textContent}`;
  document.body.append(documentHint);
  uploadGuidance.remove(); uploadStatus.textContent = '';
  const documentHelp = panel.querySelector('.meal-help-button').cloneNode(true);
  documentHelp.setAttribute('aria-label', 'Help for supporting documents');
  documentHelp.setAttribute('aria-controls', documentHint.id);
  documentHelp.setAttribute('aria-expanded', 'false');
  documents.querySelector('legend').append(documentHelp);
  upload.setAttribute('aria-describedby', documentHint.id);
  fileInput.addEventListener('change', () => { upload.textContent = fileInput.files.length ? 'Upload documents' : 'Choose documents'; uploadStatus.textContent = [...fileInput.files].map(f => f.name).join(', ') || 'No files selected.'; });
  upload.addEventListener('click', async () => {
    if (!fileInput.files.length) { fileInput.click(); return; }
    const files = [...fileInput.files];
    if (files.length > 4 || files.some(f => !['application/pdf','image/jpeg','image/png'].includes(f.type) || f.size > 1.5 * 1024 * 1024)) { uploadStatus.textContent = 'Choose up to 4 PDF, JPEG or PNG files, maximum 1.5 MB each.'; return; }
    upload.disabled = true;
    try {
      const documents = await Promise.all(files.map(f => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({name:f.name,content:r.result}); r.onerror = reject; r.readAsDataURL(f); })));
      const result = await fetch('/api/vendor/service-documents', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({documents})}); const data = await result.json(); if (!result.ok) throw new Error(data.error);
      fileInput.value = ''; upload.textContent = 'Choose documents'; uploadStatus.textContent = data.message + ' ' + files.map(f=>f.name).join(', ');
    } catch (error) { uploadStatus.textContent = error.message || 'Upload failed. Try again.'; } finally { upload.disabled = false; }
  });
  const agreements = document.createElement('fieldset'); agreements.innerHTML = '<legend>Agreements & declarations</legend>';
  agreements.className = 'meal-agreements-section';
  schema.policies.forEach(([key,title,url]) => { const label = document.createElement('label'); label.className = 'meal-agreement'; const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.agreement = key; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = `I accept ${title} *`; label.append(input,link); agreements.append(label); });
  panel.append(agreements);
  const actions = form.querySelector('.profile-actions'); if (!actions) return; actions.before(panel);
  document.dispatchEvent(new Event('uploaded-document-list-ready'));
  const save = document.createElement('button'); save.type = 'button'; save.className = 'button button-outline'; save.textContent = 'Save meal details';
  const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'button button-dark'; submit.textContent = 'Submit meal partner application →';
  actions.append(save,submit);
  const selected = () => [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(o=>o.value).filter(s=>schema.services.includes(s));
  let activeBefore = false; const hiddenActions = new Map();
  function sync() {
    const services = selected(); const active = services.length > 0; panel.hidden = !active; save.hidden = submit.hidden = !active;
    const subscriptionPolicy = panel.querySelector('[data-key="subscriptionPolicy"]');
    const needsPlan = services.some(service => ['Meal Subscription','Tiffin Service'].includes(service));
    subscriptionPolicy.dataset.required = String(needsPlan);
    subscriptionPolicy.setAttribute('aria-required', String(needsPlan));
    subscriptionPolicy.labels[0].textContent = 'Subscription pause, skip and renewal terms' + (needsPlan ? ' *' : ' (optional)');
    panel.querySelectorAll('input,textarea,button').forEach(input=>input.disabled = !active);
    serviceGroups.forEach((group,service) => { group.hidden = !services.includes(service); group.querySelectorAll('input,textarea').forEach(input=>input.disabled = !active || group.hidden); });
    if (active) {
      actions.querySelectorAll(':scope > *').forEach(el=> { if (el!==save && el!==submit) { if (!hiddenActions.has(el)) hiddenActions.set(el,el.hidden); el.hidden=true; } });
      document.querySelectorAll('.restaurant-onboarding,.cafe-onboarding,.bakery-onboarding').forEach(el=>el.hidden=true);
    } else if (activeBefore) { hiddenActions.forEach((hidden,el)=>el.hidden=hidden); hiddenActions.clear(); }
    activeBefore = active;
  }
  ['vendorMainCategory','vendorSubcategories','vendorServicesProducts'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(sync,0)));
  async function persist(submitted) {
    status.classList.remove('error'); const fields = [...panel.querySelectorAll('[data-key]')].filter(f=>!f.disabled);
    panel.querySelectorAll('[aria-invalid]').forEach(f=>f.removeAttribute('aria-invalid'));
    if (submitted) {
      const invalid = fields.find(f=>(f.dataset.required==='true' && !f.value.trim()) || !f.validity.valid) || [...agreements.querySelectorAll('input')].find(f=>!f.checked);
      if (invalid) { status.textContent = invalid.dataset.key ? `${invalid.labels[0].textContent.replace(' *','')} is required or invalid.` : 'Accept all agreements and declarations.'; status.classList.add('error'); invalid.setAttribute('aria-invalid','true'); invalid.focus(); invalid.scrollIntoView({block:'center'}); return; }
      if (fileInput.files.length) { status.textContent='Upload the selected documents before submitting.'; status.classList.add('error'); upload.focus(); return; }
    }
    save.disabled = submit.disabled = true;
    try {
      const payload = Object.fromEntries(fields.map(f=>[f.dataset.key,f.value])); payload.services=selected(); payload.submit=submitted; payload.agreements=Object.fromEntries([...agreements.querySelectorAll('input')].map(f=>[f.dataset.agreement,f.checked]));
      const result = await fetch('/api/vendor/meal-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data = await result.json(); if (!result.ok) throw new Error(data.error); status.textContent=data.message;
    } catch(error) { status.textContent=error.message; status.classList.add('error'); } finally { save.disabled=submit.disabled=false; }
  }
  save.addEventListener('click',()=>persist(false)); submit.addEventListener('click',()=>persist(true));
  // Route keyboard submission to meal without invoking unrelated profile handlers.
  window.addEventListener('submit',event=>{if(event.target===form && !panel.hidden){event.preventDefault();event.stopImmediatePropagation();persist(true);}},true);
  sync();
  try { const result=await fetch('/api/vendor/meal-onboarding'); if (!result.ok) return; const data=await result.json(); panel.querySelectorAll('[data-key]').forEach(f=>f.value=data.details[f.dataset.key]||''); agreements.querySelectorAll('input').forEach(f=>f.checked=data.details.agreements?.[f.dataset.agreement]===true); status.textContent=`Meal service status: ${data.status}. Reselect your meal services above to continue a saved application.`; } catch { status.textContent='Could not load saved meal details. Reload before editing.'; }
})();


