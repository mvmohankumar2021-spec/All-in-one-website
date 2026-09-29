(async () => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form) return;
  let schema;
  try {
    const response = await fetch('/retail-schema.json');
    if (!response.ok) throw new Error('Retail form unavailable');
    schema = await response.json();
  } catch {
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.textContent = 'The retail form could not load. Please reload the page. If this continues, contact support.';
    form.querySelector('.profile-actions')?.before(error);
    return;
  }
  const panel = document.createElement('section');
  panel.className = 'retail-onboarding'; panel.hidden = true;
  const style = document.createElement('style');
  style.textContent = '.retail-onboarding{grid-column:1/-1;min-width:0;border:1px solid #d7e3ee;border-radius:14px;background:#f8fafc;padding:24px;color:#243c52}.retail-onboarding[hidden]{display:none}.retail-onboarding fieldset{min-width:0;border:0;border-top:1px solid #d7e3ee;padding:20px 0;margin:0}.retail-onboarding legend{font-size:20px;font-weight:700;padding:8px 0}.retail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.retail-field{min-width:0}.retail-field label{display:block;margin-bottom:8px}.retail-field input,.retail-field textarea{box-sizing:border-box;width:100%;min-width:0;min-height:46px}.retail-field details{margin-top:6px}.retail-field summary{cursor:pointer;color:#245577;font-size:13px}.retail-field details p{background:#e8f1fa;padding:12px;border-radius:8px;font-size:14px}.retail-agreement{display:flex!important;align-items:flex-start;gap:10px;margin:12px 0}.retail-agreement input{width:20px!important;min-width:20px;height:20px}.retail-onboarding a{color:#235b7d;text-decoration:underline}.retail-status{white-space:pre-wrap}.retail-status.error{color:#a42218;background:#fff0ed;padding:12px}.retail-onboarding [aria-invalid=true]{outline:2px solid #b42318}@media(max-width:640px){.retail-grid{grid-template-columns:1fr}.retail-onboarding{padding:16px}}';
  document.head.append(style);
  const layout = document.createElement('link');
  layout.rel = 'stylesheet'; layout.href = '/retail-layout.css'; document.head.append(layout);
  style.textContent += '.profile-actions>[hidden],.retail-onboarding [hidden]{display:none!important}';
  const heading = document.createElement('h2'); heading.textContent = 'Retail partner onboarding'; panel.append(heading);
  const intro = document.createElement('p'); intro.textContent = 'Business name and contact details are taken from your partner profile. Complete only the retail services you selected. * Required for submission.'; panel.append(intro);
  const status = document.createElement('p'); status.className = 'retail-status'; status.setAttribute('role', 'status'); panel.append(status);
  function field(def, host) {
    const [key, title, required, type, help] = def;
    const wrap = document.createElement('div'); wrap.className = 'retail-field';
    const label = document.createElement('label'); label.htmlFor = `retail-${key}`; label.textContent = title + (required ? ' *' : ' (optional)');
    const input = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    if (type === 'select') { input.add(new Option(key === 'listingRole' ? 'Select listing role' : 'Choose an option', '')); def[5].forEach(value => input.add(new Option(value, value))); } else if (type !== 'textarea') input.type = type; else input.rows = 3;
    input.id = label.htmlFor; input.dataset.key = key; input.dataset.required = String(required);
    if (type === 'number') { input.min = ['minGuests','maxGuests'].includes(key) ? '1' : '0'; input.max = '100000000'; input.step = ['minGuests','maxGuests','experience'].includes(key) ? '1' : '0.01'; }
    if (['text','textarea'].includes(type)) input.maxLength = 2000;
    if (type === 'textarea') wrap.classList.add('retail-field-wide');
    input.setAttribute('aria-required', String(required));
    const header = document.createElement('div'); header.className = 'retail-field-heading';
    const helpButton = document.createElement('button'); helpButton.type = 'button'; helpButton.className = 'retail-help-button';
    helpButton.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>';
    helpButton.setAttribute('aria-label', `Help for ${title}`);
    helpButton.setAttribute('aria-expanded', 'false');
    const hint = document.createElement('p'); hint.className = 'retail-help-tooltip'; hint.id = `retail-help-${key}`; hint.textContent = help; hint.hidden = true; hint.setAttribute('role', 'tooltip');
    helpButton.setAttribute('aria-controls', hint.id); input.setAttribute('aria-describedby', hint.id);
    header.append(label, helpButton); wrap.append(header, input); host.append(wrap); document.body.append(hint);
  }
  function closeHelp() {
    panel.querySelectorAll('.retail-help-button').forEach(button => button.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.retail-help-tooltip').forEach(hint => hint.hidden = true);
  }
  panel.addEventListener('click', event => {
    const button = event.target.closest('.retail-help-button');
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
    const button = panel.querySelector('.retail-help-button[aria-expanded="true"]');
    if (button) { closeHelp(); button.focus(); event.preventDefault(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.retail-help-button,.retail-help-tooltip')) closeHelp(); });
  window.addEventListener('resize', closeHelp);
  document.addEventListener('scroll', event => { if (!event.target.closest?.('.retail-help-tooltip')) closeHelp(); }, true);
  const roleGroup = document.createElement('fieldset'); roleGroup.innerHTML = '<legend>Shopping-centre listing role</legend>';
  field(['listingRole','Registering as',true,'select','Choose Centre operator for the centre directory and management listing, or Individual shop for a shop inside the centre.',['Centre operator','Individual shop']],roleGroup);
  panel.append(roleGroup);
  const listingRole = roleGroup.querySelector('select');
  listingRole.addEventListener('change', () => sync());
  for (const section of schema.sections) {
    const group = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = section.title;
    if (section.shopOnly) group.dataset.shopOnly = 'true';
    if (section.electronicsOnly) group.dataset.electronicsOnly = 'true';
    if (section.electronicsOnly) legend.textContent = 'Store sales & support';
    if (section.homeOnly) group.dataset.homeOnly = 'true';
    if (section.clothingOnly) group.dataset.clothingOnly = 'true';
    if (section.studioOnly) group.dataset.studioOnly = 'true';
    if (section.accessoryOnly) group.dataset.accessoryOnly = 'true';
    if (section.healthOnly) group.dataset.healthOnly = 'true';
    if (section.salonOnly) group.dataset.salonOnly = 'true';
    if (section.wellnessOnly) group.dataset.wellnessOnly = 'true';
    if (section.educationOnly) group.dataset.educationOnly = 'true';
    if (section.recruitmentOnly) group.dataset.recruitmentOnly = 'true';
    if (section.jobsOnly) group.dataset.jobsOnly = 'true';
    if (section.freelanceOnly) group.dataset.freelanceOnly = 'true';
    if (section.softwareOnly) group.dataset.softwareOnly = 'true';
    if (section.itSupportOnly) group.dataset.itSupportOnly = 'true';
    if (section.securityOnly) group.dataset.securityOnly = 'true';
    if (section.accountingOnly) group.dataset.accountingOnly = 'true';
    if (section.registrationOnly) group.dataset.registrationOnly = 'true';
    if (section.consultingOnly) group.dataset.consultingOnly = 'true';
    if (section.officeOnly) group.dataset.officeOnly = 'true';
    if (section.bankingOnly) group.dataset.bankingOnly = 'true';
    if (section.loanOnly) group.dataset.loanOnly = 'true';
    if (section.insuranceOnly) group.dataset.insuranceOnly = 'true';
    if (section.investmentOnly) group.dataset.investmentOnly = 'true';
    if (section.legalOnly) group.dataset.legalOnly = 'true';
    if (section.vehicleDealerOnly) group.dataset.vehicleDealerOnly = 'true';
    if (section.vehicleRepairOnly) group.dataset.vehicleRepairOnly = 'true';
    if (section.roadOnly) group.dataset.roadOnly = 'true';
    if (section.travelOnly) group.dataset.travelOnly = 'true';
    if (section.rentalOnly) group.dataset.rentalOnly = 'true';
    if (section.hotelOnly) group.dataset.hotelOnly = 'true';
    if (section.deviceOnly) group.dataset.deviceOnly = 'true';
    if (section.coachingOnly) group.dataset.coachingOnly = 'true';
    if (section.itTrainingOnly) group.dataset.itTrainingOnly = 'true';
    if (section.languageOnly) group.dataset.languageOnly = 'true';
    if (section.onlineLearningOnly) group.dataset.onlineLearningOnly = 'true';
    if (section.practicalTrainingOnly) group.dataset.practicalTrainingOnly = 'true';
    if (section.medicalSupplyOnly) group.dataset.medicalSupplyOnly = 'true';
    if (section.careOnly) group.dataset.careOnly = 'true';
    if (section.diagnosticOnly) group.dataset.diagnosticOnly = 'true';
    if (section.visionProductOnly) group.dataset.visionProductOnly = 'true';
    if (section.dentalOnly) group.dataset.dentalOnly = 'true';
    const grid = document.createElement('div'); grid.className = 'retail-grid';
    // Pair controls of the same height, preserving their order within each group.
    // DOM order also remains the keyboard order on desktop and mobile.
    for (const definitions of [section.fields.filter(def => def[3] !== 'textarea'), section.fields.filter(def => def[3] === 'textarea')]) {
      for (let index = 0; index < definitions.length; index += 2) {
        const row = document.createElement('div'); row.className = 'retail-field-pair';
        definitions.slice(index, index + 2).forEach(def => field(def, row)); grid.append(row);
      }
    }
    group.append(legend, grid); panel.append(group);
  }
  const specific = document.createElement('fieldset'); specific.innerHTML = '<legend>Selected service details</legend>';
  const serviceGroups = new Map();
  for (const service of schema.services) { const group = document.createElement('div'); field(schema.specific[service], group); specific.append(group); serviceGroups.set(service, group); }
  panel.append(specific);
  const documents = document.createElement('fieldset'); documents.innerHTML = '<legend>Supporting documents</legend><p>Upload current applicable business/trade registration, store photographs, sample catalogue and relevant product safety or brand authorisation evidence. Centre operators should include management authority and applicable building, occupancy and fire-safety evidence. Existing profile documents remain available; do not upload duplicates.</p><input id="retail-files" type="file" multiple accept="application/pdf,image/jpeg,image/png" aria-label="Select retail supporting documents" hidden><button type="button" class="button button-outline">Choose documents</button><p class="retail-file-status" role="status">PDF, JPEG or PNG; up to 4 files per upload, maximum 1.5 MB each.</p><p><a href="#certificateList">View uploaded profile documents</a></p>';
  panel.append(documents);
  documents.classList.add('retail-documents');
  const uploadedList = document.createElement('ul'); uploadedList.dataset.uploadedDocumentList = ''; documents.append(uploadedList);
  const fileInput = documents.querySelector('input'), upload = documents.querySelector('button'), uploadStatus = documents.querySelector('.retail-file-status');
  const documentHint = document.createElement('p');
  documentHint.id = 'retail-help-documents'; documentHint.className = 'retail-help-tooltip';
  documentHint.setAttribute('role', 'tooltip'); documentHint.hidden = true;
  const uploadGuidance = documents.querySelector(':scope > p');
  documentHint.textContent = `${uploadGuidance.textContent}\n\n${uploadStatus.textContent}`;
  document.body.append(documentHint);
  uploadGuidance.remove(); uploadStatus.textContent = '';
  const documentHelp = panel.querySelector('.retail-help-button').cloneNode(true);
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
  agreements.className = 'retail-agreements-section';
  schema.policies.forEach(([key,title,url]) => { const label = document.createElement('label'); label.className = 'retail-agreement'; const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.agreement = key; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = `I accept ${title} *`; label.append(input,link); agreements.append(label); });
  panel.append(agreements);
  const actions = form.querySelector('.profile-actions'); if (!actions) return; actions.before(panel);
  document.dispatchEvent(new Event('uploaded-document-list-ready'));
  const save = document.createElement('button'); save.type = 'button'; save.className = 'button button-outline'; save.textContent = 'Save retail details';
  const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'button button-dark'; submit.textContent = 'Submit retail partner application →';
  actions.append(save,submit);
  const selected = () => [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(o=>o.value).filter(s=>schema.services.includes(s));
  let activeBefore = false; const hiddenActions = new Map();
  const retailIntro = intro.textContent;
  const retailDocumentHelp = documentHint.textContent;
  const evidenceHint = document.getElementById('retail-help-evidence');
  const retailEvidenceHelp = evidenceHint.textContent;
  const studioEvidenceHelp = 'Reuse profile documents. Add applicable registration, portfolio or sample-work photographs and relevant qualification or experience evidence. Include permission for customer photos and evidence for any uniform safety claims.';
  function sync() {
    const services = selected(); const active = services.length > 0; panel.hidden = !active; save.hidden = submit.hidden = !active;
    panel.querySelectorAll('input,textarea,select,button').forEach(input=>input.disabled = !active);
    serviceGroups.forEach((group,service) => { group.hidden = !services.includes(service); group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || group.hidden); });
    const centre = services.includes('Shopping Centre');
    roleGroup.hidden = !centre; listingRole.disabled = !active || !centre;
    const operator = centre && listingRole.value === 'Centre operator';
    const shop = !operator || services.some(service => service !== 'Shopping Centre');
    const studio = services.some(service => schema.studioServices.includes(service));
    const salon = services.some(service => schema.salonServices.includes(service));
    const salonOnly = salon && services.every(service => schema.salonServices.includes(service));
    const wellness = services.some(service => schema.wellnessServices.includes(service));
    const wellnessOnly = wellness && services.every(service => schema.wellnessServices.includes(service));
    const education = services.some(service => schema.educationServices.includes(service));
    const onlineLearning = services.some(service => schema.onlineLearningServices.includes(service));
    const onlineOnly = onlineLearning && services.every(service => schema.onlineLearningServices.includes(service));
    panel.querySelectorAll('[data-online-learning-only]').forEach(group => { group.hidden = !onlineLearning; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !onlineLearning); });
    const practicalTraining = services.some(service => schema.practicalTrainingServices.includes(service));
    panel.querySelectorAll('[data-practical-training-only]').forEach(group => { group.hidden = !practicalTraining; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !practicalTraining); });
    const languageTraining = services.some(service => schema.languageServices.includes(service));
    panel.querySelectorAll('[data-language-only]').forEach(group => { group.hidden = !languageTraining; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !languageTraining); });
    const itTraining = services.some(service => schema.itTrainingServices.includes(service));
    panel.querySelectorAll('[data-it-training-only]').forEach(group => { group.hidden = !itTraining; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !itTraining); });
    const coaching = services.some(service => schema.coachingServices.includes(service));
    panel.querySelectorAll('[data-coaching-only]').forEach(group => { group.hidden = !coaching; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !coaching); });
    const educationOnly = education && services.every(service => schema.educationServices.includes(service));
    const recruitment = services.some(service => schema.recruitmentServices.includes(service));
    const recruitmentOnly = recruitment && services.every(service => schema.recruitmentServices.includes(service));
    const jobServices = services.some(service => schema.jobServices.includes(service));
    const jobsOnly = jobServices && services.every(service => schema.jobServices.includes(service));
    const freelance = services.some(service => schema.freelanceServices.includes(service));
    const software = services.some(service => schema.softwareServices.includes(service));
    const itSupport = services.some(service => schema.itSupportServices.includes(service));
    const security = services.some(service => schema.securityServices.includes(service));
    const accounting = services.some(service => schema.accountingServices.includes(service));
    const registration = services.some(service => schema.registrationServices.includes(service));
    const consulting = services.some(service => schema.consultingServices.includes(service));
    const office = services.some(service => schema.officeServices.includes(service));
    const banking = services.some(service => schema.bankingServices.includes(service));
    const insurance = services.some(service => schema.insuranceServices.includes(service));
    const investment = services.some(service => schema.investmentServices.includes(service));
    const legal = services.some(service => schema.legalServices.includes(service));
    const vehicleDealer = services.some(service => schema.vehicleDealerServices.includes(service));
    const vehicleRepair = services.some(service => schema.vehicleRepairServices.includes(service));
    const road = services.some(service => schema.roadServices.includes(service));
    const travel = services.some(service => schema.travelServices.includes(service));
    const rental = services.some(service => schema.rentalServices.includes(service));
    const hotel = services.some(service => schema.hotelServices.includes(service));
    panel.querySelectorAll('[data-hotel-only]').forEach(group => { group.hidden = !hotel; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !hotel); });
    panel.querySelectorAll('[data-rental-only]').forEach(group => { group.hidden = !rental; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !rental); });
    panel.querySelectorAll('[data-travel-only]').forEach(group => { group.hidden = !travel; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !travel); });
    panel.querySelectorAll('[data-road-only]').forEach(group => { group.hidden = !road; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !road); });
    panel.querySelectorAll('[data-vehicle-repair-only]').forEach(group => { group.hidden = !vehicleRepair; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !vehicleRepair); });
    panel.querySelectorAll('[data-vehicle-dealer-only]').forEach(group => { group.hidden = !vehicleDealer; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !vehicleDealer); });
    panel.querySelectorAll('[data-legal-only]').forEach(group => { group.hidden = !legal; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !legal); });
    panel.querySelectorAll('[data-investment-only]').forEach(group => { group.hidden = !investment; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !investment); });
    panel.querySelectorAll('[data-insurance-only]').forEach(group => { group.hidden = !insurance; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !insurance); });
    const loan = services.some(service => schema.loanServices.includes(service));
    panel.querySelectorAll('[data-loan-only]').forEach(group => { group.hidden = !loan; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !loan); });
    panel.querySelectorAll('[data-banking-only]').forEach(group => { group.hidden = !banking; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !banking); });
    panel.querySelectorAll('[data-office-only]').forEach(group => { group.hidden = !office; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !office); });
    panel.querySelectorAll('[data-consulting-only]').forEach(group => { group.hidden = !consulting; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !consulting); });
    panel.querySelectorAll('[data-registration-only]').forEach(group => { group.hidden = !registration; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !registration); });
    panel.querySelectorAll('[data-accounting-only]').forEach(group => { group.hidden = !accounting; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !accounting); });
    panel.querySelectorAll('[data-security-only]').forEach(group => { group.hidden = !security; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !security); });
    panel.querySelectorAll('[data-it-support-only]').forEach(group => { group.hidden = !itSupport; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !itSupport); });
    panel.querySelectorAll('[data-software-only]').forEach(group => { group.hidden = !software; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !software); });
    const freelanceOnly = freelance && services.every(service => schema.freelanceServices.includes(service));
    const device = services.some(service => schema.deviceServices.includes(service));
    const deviceOnly = device && services.every(service => schema.deviceServices.includes(service));
    const deviceSales = services.some(service => ['Computer Sales','Laptop Sales','Mobile Sales'].includes(service));
    const deviceRepair = services.some(service => ['Computer Repair','Laptop Repair','Mobile Repair'].includes(service));
    const studioOnly = (studio || salon || wellness || education || recruitment || jobServices || freelance || device) && services.every(service => [...schema.studioServices,...schema.salonServices,...schema.wellnessServices,...schema.educationServices,...schema.recruitmentServices,...schema.jobServices,...schema.freelanceServices,...schema.deviceServices].includes(service));
    panel.querySelectorAll('[data-device-only]').forEach(group => { group.hidden = !device; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !device); });
    panel.querySelectorAll('[data-freelance-only]').forEach(group => { group.hidden = !freelance; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !freelance); });
    panel.querySelectorAll('[data-jobs-only]').forEach(group => { group.hidden = !jobServices; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !jobServices); });
    panel.querySelectorAll('[data-recruitment-only]').forEach(group => { group.hidden = !recruitment; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !recruitment); });
    panel.querySelectorAll('[data-education-only]').forEach(group => { group.hidden = !education; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !education); });
    panel.querySelectorAll('[data-wellness-only]').forEach(group => { group.hidden = !wellness; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !wellness); });
    panel.querySelectorAll('[data-salon-only]').forEach(group => { group.hidden = !salon; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !salon); });
    const health = services.some(service => schema.healthServices.includes(service));
    const medicalSupply = services.some(service => schema.medicalSupplyServices.includes(service));
    panel.querySelectorAll('[data-medical-supply-only]').forEach(group => { group.hidden = !medicalSupply; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !medicalSupply); });
    const care = services.some(service => schema.careServices.includes(service));
    const elderOnly = services.length > 0 && services.every(service => service === 'Elder Care');
    panel.querySelectorAll('[data-care-only]').forEach(group => { group.hidden = !care; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !care); });
    const diagnostic = services.some(service => schema.diagnosticServices.includes(service));
    panel.querySelectorAll('[data-diagnostic-only]').forEach(group => { group.hidden = !diagnostic; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !diagnostic); });
    const visionProduct = services.some(service => ['Optical Store','Hearing Aid Centre'].includes(service));
    panel.querySelectorAll('[data-vision-product-only]').forEach(group => { group.hidden = !visionProduct; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !visionProduct); });
    const dental = services.some(service => schema.dentalServices.includes(service));
    panel.querySelectorAll('[data-dental-only]').forEach(group => { group.hidden = !dental; group.querySelectorAll('input,textarea,select').forEach(input => input.disabled = !active || !dental); });
    const healthOnly = health && services.every(service => schema.healthServices.includes(service));
    heading.textContent = healthOnly ? 'Healthcare provider onboarding' : studioOnly ? 'Fashion service partner onboarding' : 'Retail partner onboarding';
    intro.textContent = health ? 'Provider information only. Do not upload patient records. Credentials and service claims require review before publication.' : studioOnly ? 'Profile contact details are reused. Complete only your selected fashion services. * Required for submission.' : retailIntro;
    save.textContent = healthOnly ? 'Save healthcare details' : studioOnly ? 'Save service details' : 'Save retail details';
    submit.textContent = healthOnly ? 'Submit healthcare application →' : studioOnly ? 'Submit fashion service application →' : 'Submit retail partner application →';
    evidenceHint.textContent = studio ? studioEvidenceHelp : retailEvidenceHelp;
    documentHint.textContent = studioOnly ? `${studioEvidenceHelp}\n\nPDF, JPEG or PNG; up to 4 files per upload, maximum 1.5 MB each.` : retailDocumentHelp;
    if (healthOnly) documentHint.textContent = `${schema.sections.find(section=>section.healthOnly).fields.find(field=>field[0]==='healthCredentials')[4]}\n\nPDF, JPEG or PNG; up to 4 files per upload, maximum 1.5 MB each.`;
    if (salonOnly) {
      heading.textContent = 'Salon partner onboarding';
      intro.textContent = 'Salon operations and customer care';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.salonOnly).fields.find(field=>field[0]==='salonSafety')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    if (wellnessOnly) {
      heading.textContent = 'Wellness partner onboarding';
      intro.textContent = 'Clinical services require separate credential review; submit only non-medical wellness services here.';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.wellnessOnly).fields.find(field=>field[0]==='wellSafety')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    panel.querySelectorAll('[data-health-only]').forEach(group => { group.hidden = !health; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !health); });
    if (deviceOnly) {
      heading.textContent = 'Device sales, repair and recovery onboarding';
      intro.textContent = 'Device services, technicians and evidence';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.deviceOnly).fields.find(field=>field[0]==='deviceProfile')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    if (freelanceOnly) {
      heading.textContent = legal ? 'Legal service provider details' : investment ? 'Investment and planning provider details' : insurance ? 'Insurance provider details' : banking ? 'Banking service provider details' : office ? 'Workspace and office services' : consulting ? 'Business and management consulting' : registration ? 'Registration, certification and compliance' : accounting ? 'Accounting and tax services' : security ? 'Security systems and services' : itSupport ? 'IT infrastructure and support' : software ? 'Software development onboarding' : 'Freelance and project services onboarding';
      intro.textContent = 'Provider skills, coverage and evidence';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.freelanceOnly).fields.find(field=>field[0]==='freeProfile')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    if (jobsOnly) {
      heading.textContent = 'Employer and vacancy onboarding';
      intro.textContent = 'These details are private onboarding information, not a published vacancy. Use Job openings after employer approval.';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.jobsOnly).fields.find(field=>field[0]==='jobSelection')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    if (recruitmentOnly) {
      heading.textContent = 'Recruitment partner onboarding';
      intro.textContent = 'Agency coverage and engagement process';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.recruitmentOnly).fields.find(field=>field[0]==='recruitPrivacy')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    if (educationOnly) {
      heading.textContent = practicalTraining ? 'Creative and vocational training onboarding' : languageTraining ? 'Language training onboarding' : itTraining ? 'Technology training onboarding' : coaching ? 'Coaching centre onboarding' : 'Institution partner onboarding';
      intro.textContent = 'Institution management and recognition';
      submit.textContent = 'Submit application';
      documentHint.textContent = schema.sections.find(section=>section.educationOnly).fields.find(field=>field[0]==='eduSafety')[4];
      evidenceHint.textContent = documentHint.textContent;
    }
    // Healthcare captures facility registration/evidence in its own section.
    for (const key of ['registration','expiry','evidence']) {
      const input = panel.querySelector(`[data-key="${key}"]`);
      input.closest('fieldset').hidden = healthOnly;
      input.closest('fieldset').querySelectorAll('input,textarea,select').forEach(control=>control.disabled = !active || healthOnly);
    }
    panel.querySelectorAll('[data-studio-only]').forEach(group => { group.hidden = !studio; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !studio); });
    panel.querySelectorAll('[data-shop-only]').forEach(group => { group.hidden = !shop || studioOnly || healthOnly; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !shop || studioOnly || healthOnly); });
    const hardware = services.some(service => [...schema.electronicsServices, ...schema.homeServices].includes(service));
    const clothing = services.some(service => schema.clothingServices.includes(service));
    const clothingOnly = clothing && services.every(service => schema.clothingServices.includes(service));
    const accessories = services.some(service => schema.accessoryServices.includes(service));
    panel.querySelectorAll('[data-accessory-only]').forEach(group => { group.hidden = !accessories; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !accessories); });
    const enhancedServices = [...schema.electronicsServices, ...schema.homeServices, ...schema.clothingServices, ...schema.accessoryServices, ...schema.medicalSupplyServices];
    const electronics = services.some(service => enhancedServices.includes(service));
    const electronicsOnly = electronics && services.every(service => enhancedServices.includes(service));
    const home = services.some(service => schema.homeServices.includes(service));
    panel.querySelectorAll('[data-home-only]').forEach(group => { group.hidden = !home; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !home); });
    panel.querySelectorAll('[data-clothing-only]').forEach(group => { group.hidden = !clothing; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !clothing); });
    panel.querySelectorAll('[data-electronics-only]').forEach(group => { group.hidden = !electronics; group.querySelectorAll('input,textarea,select').forEach(input=>input.disabled = !active || !electronics); });
    const delivery = panel.querySelector('[data-key="deliveryOffered"]').value === 'Yes';
    const installation = panel.querySelector('[data-key="installationOffered"]').value === 'Yes';
    const bridal = services.includes('Bridal Wear');
    const conditional = {
      coachHomeDetails: coaching && panel.querySelector('[data-key="coachHome"]').value === 'Yes',
      coachTestsDetails: coaching && panel.querySelector('[data-key="coachTests"]').value === 'Yes',
      wellHomeDetails: wellness && panel.querySelector('[data-key="wellHomeOffered"]').value === 'Yes',
      wellOnlineDetails: wellness && panel.querySelector('[data-key="wellOnlineOffered"]').value === 'Yes',
      wellRetreatDetails: wellness && panel.querySelector('[data-key="wellRetreatOffered"]').value === 'Yes',
      salonHomeDetails: salon && panel.querySelector('[data-key="salonHomeOffered"]').value === 'Yes',
      equipmentRentalOffered: services.includes('Medical Equipment'),
      equipmentRentalTerms: services.includes('Medical Equipment') && panel.querySelector('[data-key="equipmentRentalOffered"]').value === 'Yes',
      clinicians: health && !elderOnly,
      sampleCollectionDetails: diagnostic && panel.querySelector('[data-key="sampleCollectionOffered"]').value === 'Yes',
      visionDelivery: visionProduct && panel.querySelector('[data-key="visionDeliveryOffered"]').value === 'Yes',
      installationOffered: hardware, warrantyDetails: hardware || accessories, installationDetails: hardware && installation,
      customDetails: home && panel.querySelector('[data-key="customOffered"]').value === 'Yes', largeDelivery: home && delivery,
      tailoringDetails: clothing && panel.querySelector('[data-key="tailoringOffered"]').value === 'Yes',
      bridalRentalOffered: bridal, bridalRentalTerms: bridal && panel.querySelector('[data-key="bridalRentalOffered"]').value === 'Yes',
      filePrivacy: shop && !clothingOnly && !studioOnly && !healthOnly,
      businessType: !healthOnly,
      emergencyDetails: health && panel.querySelector('[data-key="emergencyOffered"]').value === 'Yes',
      teleDetails: health && panel.querySelector('[data-key="teleOffered"]').value === 'Yes',
      healthVisitDetails: health && panel.querySelector('[data-key="healthVisitOffered"]').value === 'Yes',
      collectionDetails: studio && panel.querySelector('[data-key="collectionOffered"]').value === 'Yes',
      studioVisitDetails: studio && panel.querySelector('[data-key="studioVisitOffered"]').value === 'Yes'
    };
    ['radius','areas','delivery'].forEach(key => conditional[key] = shop && !studioOnly && !healthOnly && (!electronicsOnly || delivery));
    ['extras','customPolicy'].forEach(key => conditional[key] = shop && !studioOnly && !healthOnly && (!electronicsOnly || accessories));
    conditional.warranty = shop && !studioOnly && !healthOnly && !electronicsOnly;
    conditional.itBackupDetails = itSupport && panel.querySelector('[data-key="itBackup"]').value === 'Yes';
    conditional.securityMaintenanceDetails = security && panel.querySelector('[data-key="securityMaintenance"]').value === 'Yes';
    ['softwareHosting','softwareIntegration','softwareMigration','softwareSupport','softwarePublishing','softwareCompliance'].forEach(key => conditional[key+'Details'] = software && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    conditional.deviceSalesTerms = deviceSales;
    conditional.deviceRepairTerms = deviceRepair;
    ['devicePickup','deviceOnsite','deviceRemote','devicePartner','deviceBulk'].forEach(key => conditional[key+'Details'] = device && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['freeOnsite','freeTeam','freeRights','freeData','freeRegulated'].forEach(key => conditional[key+'Details'] = freelance && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['recruitOverseas','recruitChecks','recruitPayroll','recruitBulk'].forEach(key => conditional[key+'Details'] = recruitment && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['digitalSubscription','digitalThirdParty'].forEach(key => conditional[key+'Details'] = onlineLearning && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    if (onlineOnly) {
      heading.textContent = 'Online learning onboarding';
    }
    ['practicalHome','practicalRental','practicalEvents','practicalPlacement'].forEach(key => conditional[key+'Details'] = practicalTraining && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['languageHome','languageExam','languageCorporate'].forEach(key => conditional[key+'Details'] = languageTraining && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['itCorporate','itCertification','itPlacement'].forEach(key => conditional[key+'Details'] = itTraining && panel.querySelector(`[data-key="${key}"]`).value === 'Yes');
    ['eduTransport','eduMeals','eduHostel','eduOnline','eduExtended'].forEach(key => { conditional[key] = education && !onlineOnly; conditional[key+'Details'] = education && !onlineOnly && panel.querySelector(`[data-key="${key}"]`).value === 'Yes'; });
    ['healthFacilities','healthAppointments','healthFees','emergencyOffered','teleOffered','healthVisitOffered'].forEach(key => conditional[key] = health && !elderOnly);
    if (elderOnly) ['healthFacilities','healthAppointments','healthFees','emergencyOffered','emergencyDetails','teleOffered','teleDetails','healthVisitOffered','healthVisitDetails'].forEach(key => conditional[key] = false);
    if (services.every(service => service === 'Optical Store' || schema.healthServices.includes(service))) {
      ['radius','areas','delivery'].forEach(key => conditional[key] = false);
    }
    Object.entries(conditional).forEach(([key,relevant]) => {
      const input = panel.querySelector(`[data-key="${key}"]`);
      input.closest('.retail-field').hidden = !relevant; input.disabled = !active || !relevant;
    });
    panel.querySelectorAll('.retail-field-pair').forEach(row => { row.hidden = [...row.children].every(field => field.hidden); });
    schema.policies.forEach(([key,,,scope]) => {
      const input = agreements.querySelector(`[data-agreement="${key}"]`);
      const relevant = scope === 'shop' ? shop && !studioOnly && !healthOnly : scope === 'operator' ? operator : true;
      input.disabled = !active || !relevant; input.closest('label').hidden = !relevant;
    });
    if (active) {
      actions.querySelectorAll(':scope > *').forEach(el=> { if (el!==save && el!==submit) { if (!hiddenActions.has(el)) hiddenActions.set(el,el.hidden); el.hidden=true; } });
      document.querySelectorAll('.restaurant-onboarding,.cafe-onboarding,.bakery-onboarding').forEach(el=>el.hidden=true);
    } else if (activeBefore) { hiddenActions.forEach((hidden,el)=>el.hidden=hidden); hiddenActions.clear(); }
    activeBefore = active;
  }
  ['vendorMainCategory','vendorSubcategories','vendorServicesProducts'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(sync,0)));
  panel.addEventListener('change', event => { if (['coachHome','coachTests','eduTransport','eduMeals','eduHostel','eduOnline','eduExtended','wellHomeOffered','wellOnlineOffered','wellRetreatOffered','salonHomeOffered','equipmentRentalOffered','sampleCollectionOffered','visionDeliveryOffered','deliveryOffered','installationOffered','customOffered','tailoringOffered','bridalRentalOffered','collectionOffered','studioVisitOffered','emergencyOffered','teleOffered','healthVisitOffered'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['itCorporate','itCertification','itPlacement'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['languageHome','languageExam','languageCorporate'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['practicalHome','practicalRental','practicalEvents','practicalPlacement'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['digitalSubscription','digitalThirdParty'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['recruitOverseas','recruitChecks','recruitPayroll','recruitBulk'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['freeOnsite','freeTeam','freeRights','freeData','freeRegulated'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['devicePickup','deviceOnsite','deviceRemote','devicePartner','deviceBulk'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (['softwareHosting','softwareIntegration','softwareMigration','softwareSupport','softwarePublishing','softwareCompliance'].includes(event.target.dataset.key)) sync(); });
  panel.addEventListener('change', event => { if (event.target.dataset.key === 'itBackup') sync(); });
  panel.addEventListener('change', event => { if (event.target.dataset.key === 'securityMaintenance') sync(); });
  async function persist(submitted) {
    status.classList.remove('error'); const fields = [...panel.querySelectorAll('[data-key]')].filter(f=>!f.disabled);
    panel.querySelectorAll('[aria-invalid]').forEach(f=>f.removeAttribute('aria-invalid'));
    if (submitted) {
      const clinical = panel.querySelector('[data-key="wellClinical"]');
      if (!clinical.disabled && clinical.value !== 'No') { status.textContent = 'Clinical services require separate credential review; submit only non-medical wellness services here.'; status.classList.add('error'); clinical.setAttribute('aria-invalid','true'); clinical.focus(); return; }
      const declaration = panel.querySelector('[data-key="healthDeclaration"]');
      if (!declaration.disabled && declaration.value !== 'Yes') { status.textContent = 'Confirm credential accuracy and publication consent.'; status.classList.add('error'); declaration.setAttribute('aria-invalid','true'); declaration.focus(); return; }
      const invalid = fields.find(f=>(f.dataset.required==='true' && !f.value.trim()) || !f.validity.valid) || [...agreements.querySelectorAll('input')].find(f=>!f.disabled && !f.checked);
      if (invalid) { status.textContent = invalid.dataset.key ? `${invalid.labels[0].textContent.replace(' *','')}: ${window.AppI18n?.t('Enter a valid value.') || 'Enter a valid value.'}` : 'Accept all agreements and declarations.'; status.classList.add('error'); invalid.setAttribute('aria-invalid','true'); invalid.focus(); invalid.scrollIntoView({block:'center'}); return; }
      if (fileInput.files.length) { status.textContent='Upload the selected documents before submitting.'; status.classList.add('error'); upload.focus(); return; }
    }
    save.disabled = submit.disabled = true;
    try {
      const payload = Object.fromEntries(fields.map(f=>[f.dataset.key,f.value])); payload.services=selected(); payload.submit=submitted; payload.agreements=Object.fromEntries([...agreements.querySelectorAll('input')].map(f=>[f.dataset.agreement,f.checked]));
      const result = await fetch('/api/vendor/retail-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data = await result.json(); if (!result.ok) throw new Error(data.error); status.textContent=data.message;
    } catch(error) { status.textContent=error.message; status.classList.add('error'); } finally { save.disabled=submit.disabled=false; }
  }
  save.addEventListener('click',()=>persist(false)); submit.addEventListener('click',()=>persist(true));
  // Route keyboard submission to retail without invoking unrelated profile handlers.
  window.addEventListener('submit',event=>{if(event.target===form && !panel.hidden){event.preventDefault();event.stopImmediatePropagation();persist(true);}},true);
  sync();
  try { const result=await fetch('/api/vendor/retail-onboarding'); if (!result.ok) return; const data=await result.json(); panel.querySelectorAll('[data-key]').forEach(f=>f.value=data.details[f.dataset.key]||''); agreements.querySelectorAll('input').forEach(f=>f.checked=data.details.agreements?.[f.dataset.agreement]===true); status.textContent=data.status || 'Not started'; sync(); } catch { status.textContent='Could not load saved retail details. Reload before editing.'; }
})();
