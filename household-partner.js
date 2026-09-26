(async () => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form) return;
  let schema;
  try {
    const response = await fetch('/household-schema.json');
    if (!response.ok) throw new Error('Household supply form unavailable');
    schema = await response.json();
  } catch {
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.textContent = 'The household form could not load. Please reload the page. If this continues, contact support.';
    form.querySelector('.profile-actions')?.before(error);
    return;
  }
  const panel = document.createElement('section');
  panel.className = 'household-onboarding'; panel.hidden = true;
  const style = document.createElement('style');
  style.textContent = '.household-onboarding{grid-column:1/-1;min-width:0;border:1px solid #d7e3ee;border-radius:14px;background:#f8fafc;padding:24px;color:#243c52}.household-onboarding[hidden]{display:none}.household-onboarding fieldset{min-width:0;border:0;border-top:1px solid #d7e3ee;padding:20px 0;margin:0}.household-onboarding legend{font-size:20px;font-weight:700;padding:8px 0}.household-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.household-field{min-width:0}.household-field label{display:block;margin-bottom:8px}.household-field input,.household-field textarea{box-sizing:border-box;width:100%;min-width:0;min-height:46px}.household-field details{margin-top:6px}.household-field summary{cursor:pointer;color:#245577;font-size:13px}.household-field details p{background:#e8f1fa;padding:12px;border-radius:8px;font-size:14px}.household-agreement{display:flex!important;align-items:flex-start;gap:10px;margin:12px 0}.household-agreement input{width:20px!important;min-width:20px;height:20px}.household-onboarding a{color:#235b7d;text-decoration:underline}.household-status{white-space:pre-wrap}.household-status.error{color:#a42218;background:#fff0ed;padding:12px}.household-onboarding [aria-invalid=true]{outline:2px solid #b42318}@media(max-width:640px){.household-grid{grid-template-columns:1fr}.household-onboarding{padding:16px}}';
  document.head.append(style);
  const layout = document.createElement('link');
  layout.rel = 'stylesheet'; layout.href = '/household-layout.css'; document.head.append(layout);
  style.textContent += '.profile-actions>[hidden],.household-onboarding [hidden]{display:none!important}';
  const heading = document.createElement('h2'); heading.textContent = 'Household supply partner onboarding'; panel.append(heading);
  const intro = document.createElement('p'); intro.textContent = 'Business name and contact details are taken from your partner profile. Complete only the household services you selected. * Required for submission.'; panel.append(intro);
  const status = document.createElement('p'); status.className = 'household-status'; status.setAttribute('role', 'status'); panel.append(status);
  function field(def, host) {
    const [key, title, required, type, help] = def;
    const wrap = document.createElement('div'); wrap.className = 'household-field';
    const label = document.createElement('label'); label.htmlFor = `household-${key}`; label.textContent = title + (required ? ' *' : ' (optional)');
    const input = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    if (type === 'select') { input.add(new Option('Select supplier role', '')); def[5].forEach(value => input.add(new Option(value, value))); } else if (type !== 'textarea') input.type = type; else input.rows = 3;
    input.id = label.htmlFor; input.dataset.key = key; input.dataset.required = String(required);
    if (type === 'number') { input.min = ['minGuests','maxGuests'].includes(key) ? '1' : '0'; input.max = '100000000'; input.step = ['minGuests','maxGuests','experience'].includes(key) ? '1' : '0.01'; }
    if (['text','textarea'].includes(type)) input.maxLength = 2000;
    if (type === 'textarea') wrap.classList.add('household-field-wide');
    input.setAttribute('aria-required', String(required));
    const header = document.createElement('div'); header.className = 'household-field-heading';
    const helpButton = document.createElement('button'); helpButton.type = 'button'; helpButton.className = 'household-help-button';
    helpButton.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>';
    helpButton.setAttribute('aria-label', `Help for ${title}`);
    helpButton.setAttribute('aria-expanded', 'false');
    const hint = document.createElement('p'); hint.className = 'household-help-tooltip'; hint.id = `household-help-${key}`; hint.textContent = help; hint.hidden = true; hint.setAttribute('role', 'tooltip');
    helpButton.setAttribute('aria-controls', hint.id); input.setAttribute('aria-describedby', hint.id);
    header.append(label, helpButton); wrap.append(header, input); host.append(wrap); document.body.append(hint);
  }
  function closeHelp() {
    panel.querySelectorAll('.household-help-button').forEach(button => button.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.household-help-tooltip').forEach(hint => hint.hidden = true);
  }
  panel.addEventListener('click', event => {
    const button = event.target.closest('.household-help-button');
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
    const button = panel.querySelector('.household-help-button[aria-expanded="true"]');
    if (button) { closeHelp(); button.focus(); event.preventDefault(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.household-help-button,.household-help-tooltip')) closeHelp(); });
  window.addEventListener('resize', closeHelp);
  document.addEventListener('scroll', event => { if (!event.target.closest?.('.household-help-tooltip')) closeHelp(); }, true);
  for (const section of schema.sections) {
    const group = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = section.title;
    const grid = document.createElement('div'); grid.className = 'household-grid';
    // Pair controls of the same height, preserving their order within each group.
    // DOM order also remains the keyboard order on desktop and mobile.
    for (const definitions of [section.fields.filter(def => def[3] !== 'textarea'), section.fields.filter(def => def[3] === 'textarea')]) {
      for (let index = 0; index < definitions.length; index += 2) {
        const row = document.createElement('div'); row.className = 'household-field-pair';
        definitions.slice(index, index + 2).forEach(def => field(def, row)); grid.append(row);
      }
    }
    group.append(legend, grid); panel.append(group);
  }
  const specific = document.createElement('fieldset'); specific.innerHTML = '<legend>Selected service details</legend>';
  const serviceGroups = new Map();
  for (const service of schema.services) { const group = document.createElement('div'); field(schema.specific[service], group); specific.append(group); serviceGroups.set(service, group); }
  panel.append(specific);
  const waterGroup = document.createElement('fieldset');
  waterGroup.innerHTML = '<legend>Drinking-water supplier role</legend>';
  field(['waterRole','Supplier role',true,'select','Choose the role for this application. Only the relevant sourcing, permission and quality-control questions are shown.',schema.waterRoles], waterGroup);
  const waterGroups = new Map();
  Object.entries(schema.waterFields).forEach(([role,def]) => { const group = document.createElement('div'); field(def,group); waterGroup.append(group); waterGroups.set(role,group); });
  panel.append(waterGroup);
  const waterRole = waterGroup.querySelector('select');
  waterRole.addEventListener('change', () => sync());
  const documents = document.createElement('fieldset'); documents.innerHTML = '<legend>Supporting documents</legend><p>Upload current applicable registration/licence proof, store and storage photographs, supplier evidence and certification supporting any product claims. Existing profile documents remain available; do not upload duplicates.</p><input id="household-files" type="file" multiple accept="application/pdf,image/jpeg,image/png" aria-label="Select household supporting documents" hidden><button type="button" class="button button-outline">Choose documents</button><p class="household-file-status" role="status">PDF, JPEG or PNG; up to 4 files per upload, maximum 1.5 MB each.</p><p><a href="#certificateList">View uploaded profile documents</a></p>';
  panel.append(documents);
  documents.classList.add('household-documents');
  const uploadedList = document.createElement('ul'); uploadedList.dataset.uploadedDocumentList = ''; documents.append(uploadedList);
  const fileInput = documents.querySelector('input'), upload = documents.querySelector('button'), uploadStatus = documents.querySelector('.household-file-status');
  const documentHint = document.createElement('p');
  documentHint.id = 'household-help-documents'; documentHint.className = 'household-help-tooltip';
  documentHint.setAttribute('role', 'tooltip'); documentHint.hidden = true;
  const uploadGuidance = documents.querySelector(':scope > p');
  documentHint.textContent = `${uploadGuidance.textContent}\n\n${uploadStatus.textContent}`;
  document.body.append(documentHint);
  uploadGuidance.remove(); uploadStatus.textContent = '';
  const documentHelp = panel.querySelector('.household-help-button').cloneNode(true);
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
  agreements.className = 'household-agreements-section';
  schema.policies.forEach(([key,title,url]) => { const label = document.createElement('label'); label.className = 'household-agreement'; const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.agreement = key; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = `I accept ${title} *`; label.append(input,link); agreements.append(label); });
  panel.append(agreements);
  const actions = form.querySelector('.profile-actions'); if (!actions) return; actions.before(panel);
  document.dispatchEvent(new Event('uploaded-document-list-ready'));
  const save = document.createElement('button'); save.type = 'button'; save.className = 'button button-outline'; save.textContent = 'Save household details';
  const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'button button-dark'; submit.textContent = 'Submit household partner application →';
  actions.append(save,submit);
  const selected = () => [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(o=>o.value).filter(s=>schema.services.includes(s));
  let activeBefore = false; const hiddenActions = new Map();
  function sync() {
    const services = selected(); const active = services.length > 0; panel.hidden = !active; save.hidden = submit.hidden = !active;
    panel.querySelectorAll('input,textarea,select,button').forEach(input=>input.disabled = !active);
    serviceGroups.forEach((group,service) => { group.hidden = !services.includes(service); group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || group.hidden); });
    const waterActive = active && services.includes('Drinking Water Supplier');
    waterGroup.hidden = !waterActive; waterRole.disabled = !waterActive;
    waterGroups.forEach((group,role) => { group.hidden = !waterActive || waterRole.value !== role; group.querySelectorAll('input,textarea').forEach(input=>input.disabled=group.hidden); });
    schema.policies.forEach(([key,,,service]) => {
      const input = agreements.querySelector(`[data-agreement="${key}"]`);
      input.disabled = !active || Boolean(service && !services.includes(service));
      input.closest('label').hidden = Boolean(service && !services.includes(service));
    });
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
      const invalid = fields.find(f=>(f.dataset.required==='true' && !f.value.trim()) || !f.validity.valid) || [...agreements.querySelectorAll('input')].find(f=>!f.disabled && !f.checked);
      if (invalid) { status.textContent = invalid.dataset.key ? `${invalid.labels[0].textContent.replace(' *','')} is required or invalid.` : 'Accept all agreements and declarations.'; status.classList.add('error'); invalid.setAttribute('aria-invalid','true'); invalid.focus(); invalid.scrollIntoView({block:'center'}); return; }
      if (fileInput.files.length) { status.textContent='Upload the selected documents before submitting.'; status.classList.add('error'); upload.focus(); return; }
    }
    save.disabled = submit.disabled = true;
    try {
      const payload = Object.fromEntries(fields.map(f=>[f.dataset.key,f.value])); payload.services=selected(); payload.submit=submitted; payload.agreements=Object.fromEntries([...agreements.querySelectorAll('input')].map(f=>[f.dataset.agreement,f.checked]));
      const result = await fetch('/api/vendor/household-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data = await result.json(); if (!result.ok) throw new Error(data.error); status.textContent=data.message;
    } catch(error) { status.textContent=error.message; status.classList.add('error'); } finally { save.disabled=submit.disabled=false; }
  }
  save.addEventListener('click',()=>persist(false)); submit.addEventListener('click',()=>persist(true));
  // Route keyboard submission to household without invoking unrelated profile handlers.
  window.addEventListener('submit',event=>{if(event.target===form && !panel.hidden){event.preventDefault();event.stopImmediatePropagation();persist(true);}},true);
  sync();
  try { const result=await fetch('/api/vendor/household-onboarding'); if (!result.ok) return; const data=await result.json(); panel.querySelectorAll('[data-key]').forEach(f=>f.value=data.details[f.dataset.key]||''); agreements.querySelectorAll('input').forEach(f=>f.checked=data.details.agreements?.[f.dataset.agreement]===true); status.textContent=`Household supply status: ${data.status}. Reselect your household services above to continue a saved application.`; sync(); } catch { status.textContent='Could not load saved household details. Reload before editing.'; }
})();
