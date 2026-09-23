(() => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form || document.querySelector('.home-technical-onboarding')) return;
  const services = ['Locksmith', 'Waterproofing', 'Roof Repair', 'CCTV Installation', 'Solar Installation', 'Packers & Movers'];
  const policies = [
    ['partner', 'I accept the SHAKALPA Service Partner Agreement', '/legal/vendor-agreement'],
    ['terms', 'I accept Platform Terms & Conditions', '/legal/terms-and-conditions'],
    ['privacy', 'I accept the Privacy / Data Policy', '/legal/privacy-policy'],
    ['conduct', 'I accept the Code of Conduct', '/legal/code-of-conduct'],
    ['safety', 'I make the required home technical services safety declaration', '/legal/home-technical-safety-declaration'],
    ['background', 'I consent to Background Verification', '/legal/background-verification-consent'],
  ];
  const panel = document.createElement('section');
  panel.className = 'plumbing-onboarding home-technical-onboarding';
  panel.hidden = true;
  panel.innerHTML = `<div class="plumbing-head"><div><p class="eyebrow">HOME TECHNICAL SERVICE PARTNER</p><h2>Home Technical Services onboarding</h2><p>Configure only the services selected above.</p></div><b>Not started</b></div><section><h3>Services, experience & starting price <i>*</i></h3><div id="technicalRows"></div></section><section><h3>Qualification, insurance & work proof</h3><label>Trade qualification / relevant experience<input></label><label>Licence, registration or insurance details<input></label><label>Upload certificate, insurance or work proof<input type="file" multiple></label></section><section><h3>Service area, pricing & policies</h3><div class="plumbing-grid"><label>City <i>*</i><input></label><label>PIN codes / service areas <i>*</i><input></label><label>Maximum travel radius<input></label><label>Inspection / visiting charge<input></label><label>Labour / service charges<input></label><label>Materials policy<input></label><label>Warranty / revisit policy<input placeholder="Warranty period and revisit terms"></label><label>Damage-claim policy<input placeholder="Required for Packers & Movers"></label></div></section><section><h3>Availability</h3><label>Working days <i>*</i><span class="plumbing-days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `<label><input type="checkbox" value="${day}"> ${day}</label>`).join('')}</span></label><div class="plumbing-grid"><label>Working hours <i>*</i><input placeholder="For example: 9:00 AM – 6:00 PM"></label><label class="plumbing-check"><input type="checkbox"> Emergency service available</label></div></section><section><h3>Bank details</h3><div class="plumbing-grid"><label>Account holder name <i>*</i><input></label><label>Account number <i>*</i><input></label><label>IFSC <i>*</i><input></label><label>UPI ID<input></label></div></section><section><h3>Agreements & declarations</h3><div class="plumbing-agreements">${policies.map(([key, text, href]) => `<label><input data-technical-policy="${key}" type="checkbox"> <a href="${href}" target="_blank" rel="noopener">${text}</a>${key !== 'background' ? ' <i>*</i>' : ''}</label>`).join('')}</div></section><button class="button button-dark" type="button">Submit home technical partner application <span>→</span></button>`;
  const actions = form.querySelector('.profile-actions');
  actions?.before(panel);
  const submit = panel.querySelector('button[type="button"]');
  submit.classList.add('service-final-submit');
  const slot = actions?.querySelector('#serviceApprovalSlot');
  if (slot) slot.replaceChildren(submit);
  else actions?.querySelector('#submitForApproval')?.replaceWith(submit);
  const rows = panel.querySelector('#technicalRows');
  rows.innerHTML = services.map(service => `<label class="plumbing-row" data-service="${service}"><strong>${service}</strong><input type="number" placeholder="Years"><input type="number" placeholder="Visit ₹"></label>`).join('');
  const sync = () => {
    const chosen = [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(option => option.value);
    const active = chosen.filter(service => services.includes(service));
    panel.hidden = !active.length;
    rows.querySelectorAll('.plumbing-row').forEach(row => {
      row.hidden = !active.includes(row.dataset.service);
      row.style.display = row.hidden ? 'none' : 'grid';
    });
  };
  ['vendorServicesProducts', 'vendorSubcategories'].forEach(id => document.querySelector(`#${id}`)?.addEventListener('change', sync));
  sync();
})();
