(() => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form || document.querySelector('.construction-onboarding')) return;
  const services = ['Residential Construction', 'Commercial Construction', 'Building Renovation', 'Civil Contracting', 'Structural Work', 'Site Supervision'];
  const regulated = new Set(['Commercial Construction', 'Civil Contracting', 'Structural Work', 'Site Supervision']);
  const policies = [
    ['I accept the SHAKALPA Service Partner Agreement', '/legal/vendor-agreement', true],
    ['I accept Platform Terms & Conditions', '/legal/terms-and-conditions', true],
    ['I accept the Privacy / Data Policy', '/legal/privacy-policy', true],
    ['I accept the Code of Conduct', '/legal/code-of-conduct', true],
    ['I make the required construction safety declaration', '/legal/construction-safety-declaration', true],
    ['I consent to Background Verification', '/legal/background-verification-consent', false],
  ];
  const panel = document.createElement('section');
  panel.className = 'plumbing-onboarding construction-onboarding';
  panel.hidden = true;
  panel.innerHTML = `<div class="plumbing-head"><div><p class="eyebrow">CONSTRUCTION SERVICE PARTNER</p><h2>Construction onboarding</h2><p>Provide only the construction services your organisation is qualified and insured to perform.</p></div><b>Not started</b></div><p class="plumbing-flow">Business & KYC → Services → Credentials → Project capacity → Service area → Pricing → Safety → Availability → Bank details → Agreements → Verification → Activation</p><section><h3>Services, experience & starting consultation price <i>*</i></h3><p>Select the construction services above, then add the experience and starting site-consultation price for each.</p><div id="constructionRows"></div></section><section id="constructionCredentials"><h3>Contractor credentials & work proof <i>*</i></h3><p>Contractor registration, GST, insurance, and relevant engineer credentials are required before activation. Structural Work and Site Supervision require qualified professional documentation.</p><label>Contractor registration / licence number <i>*</i><input placeholder="Registration number and issuing authority"></label><div class="plumbing-grid"><label>GST number <i>*</i><input placeholder="GST registration number"></label><label>Liability / contractor insurance <i>*</i><input placeholder="Insurer, policy number and expiry"></label><label>Civil / structural engineer qualification or registration<input placeholder="Required for structural or supervision work"></label><label>Past project summary / work orders <i>*</i><input placeholder="Completed project types and references"></label></div><label class="plumbing-document-upload">Upload licences, insurance, engineer credentials or work proof <i>*</i><input type="file" accept="application/pdf,image/jpeg,image/png" multiple><small>PDF, JPEG, or PNG · up to 4 files · 1.5 MB each</small></label></section><section><h3>Project capacity & service area</h3><div class="plumbing-grid"><label>Team size <i>*</i><input type="number" min="1" placeholder="Number of workers and supervisors"></label><label>Machinery / equipment availability<input placeholder="For example: mixer, scaffolding, safety gear"></label><label>City <i>*</i><input></label><label>PIN codes / service areas <i>*</i><input></label><label>Maximum travel radius<input placeholder="For example: 30 km"></label><label>Typical project capacity<input placeholder="For example: up to 5,000 sq ft"></label></div></section><section><h3>Pricing, warranty & damage claims</h3><div class="plumbing-grid"><label>Site inspection / consultation charge<input placeholder="For example: ₹999"></label><label>Labour / service charges<input placeholder="For example: quoted per project"></label><label>Material charges policy <i>*</i><input placeholder="Included, customer supplied, or quoted separately"></label><label>Quotation and change-order process <i>*</i><input placeholder="How scope and additional charges are approved"></label><label>Warranty / defect-liability policy <i>*</i><input placeholder="Warranty term and exclusions"></label><label>Damage-claim and dispute process <i>*</i><input placeholder="How damage, loss, and disputes are handled"></label></div></section><section><h3>Site safety & availability</h3><label>Site safety plan and PPE practice <i>*</i><input placeholder="PPE, risk assessment, incident reporting, and site controls"></label><label>Working days <i>*</i><span class="plumbing-days">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => `<label><input type="checkbox" value="${day}"> ${day}</label>`).join('')}</span></label><div class="plumbing-grid"><label>Working hours <i>*</i><input placeholder="For example: 9:00 AM – 6:00 PM"></label><label class="plumbing-check"><input type="checkbox"> Emergency site support available</label></div></section><section><h3>Bank details</h3><div class="plumbing-grid"><label>Account holder name <i>*</i><input></label><label>Account number <i>*</i><input inputmode="numeric"></label><label>IFSC <i>*</i><input></label><label>UPI ID<input></label></div></section><section><h3>Agreements & declarations</h3><div class="plumbing-agreements">${policies.map(([text, href, required]) => `<label><input type="checkbox"> <a href="${href}" target="_blank" rel="noopener">${text}</a>${required ? ' <i>*</i>' : ''}</label>`).join('')}</div></section><button class="button button-dark service-final-submit" type="button">Submit construction partner application <span>→</span></button>`;
  const actions = form.querySelector('.profile-actions');
  actions?.before(panel);
  const submit = panel.querySelector('button[type="button"]');
  let approvalSlot = actions?.querySelector('#serviceApprovalSlot');
  if (!approvalSlot && actions) {
    const defaultApproval = actions.querySelector('#submitForApproval');
    if (defaultApproval) {
      approvalSlot = document.createElement('span');
      approvalSlot.id = 'serviceApprovalSlot';
      approvalSlot.className = 'service-approval-slot';
      approvalSlot._defaultApproval = defaultApproval;
      defaultApproval.replaceWith(approvalSlot);
      approvalSlot.append(defaultApproval);
    }
  }
  const rows = panel.querySelector('#constructionRows');
  rows.innerHTML = services.map(service => `<label class="plumbing-row" data-service="${service}"><strong>${service}${regulated.has(service) ? '<small> Credential check required</small>' : ''}</strong><input type="number" min="0" placeholder="Years"><input type="number" min="0" placeholder="Site visit ₹"></label>`).join('');
  const sync = () => {
    const chosen = [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(option => option.value);
    const active = chosen.filter(service => services.includes(service));
    panel.hidden = active.length === 0;
    rows.querySelectorAll('.plumbing-row').forEach(row => { const visible = active.includes(row.dataset.service); row.hidden = !visible; row.style.display = visible ? 'grid' : 'none'; });
    if (approvalSlot) {
      if (!panel.hidden) approvalSlot.replaceChildren(submit);
      else if (approvalSlot.contains(submit)) approvalSlot.replaceChildren(approvalSlot._defaultApproval);
    }
  };
  ['vendorMainCategory', 'vendorSubcategories', 'vendorServicesProducts'].forEach(id => document.querySelector(`#${id}`)?.addEventListener('change', sync));
  sync();
})();
