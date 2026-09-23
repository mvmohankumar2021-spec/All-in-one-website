(() => {
  const form = document.querySelector('#vendorProfileForm');
  if (!form || document.querySelector('.real-estate-services-onboarding')) return;

  const services = ['Real Estate Agent', 'Property Management', 'Property Valuation', 'Property Legal Service', 'Home Loan Assistance'];
  const regulated = new Set(['Property Valuation', 'Property Legal Service', 'Home Loan Assistance']);
  const policies = [
    ['I accept the SHAKALPA Service Partner Agreement', '/legal/vendor-agreement', true],
    ['I accept Platform Terms & Conditions', '/legal/terms-and-conditions', true],
    ['I accept the Privacy / Data Policy', '/legal/privacy-policy', true],
    ['I accept the Code of Conduct', '/legal/code-of-conduct', true],
    ['I make the required real estate services compliance declaration', '/legal/real-estate-services-compliance-declaration', true],
    ['I consent to Background Verification', '/legal/background-verification-consent', false],
  ];

  const panel = document.createElement('section');
  panel.className = 'plumbing-onboarding real-estate-services-onboarding';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="plumbing-head"><div><p class="eyebrow">REAL ESTATE SERVICES PARTNER</p><h2>Real estate services onboarding</h2><p>Provide only services for which your business, professional credentials, and authority are current and verifiable.</p></div><b>Not started</b></div>
    <p class="plumbing-flow">Business & KYC → Services → Registration & credentials → Service area → Fees & disclosures → Operations → Availability → Bank details → Agreements → Verification → Activation</p>
    <section><h3>Services, experience & starting price <i>*</i></h3><p>Select services above, then enter the relevant experience and starting consultation or service price.</p><div id="realEstateServicesRows"></div></section>
    <section><h3>Registration, credentials & documents <i>*</i></h3><div class="plumbing-grid">
      <label>Business / brokerage registration <i>*</i><input placeholder="Business registration and legal entity"></label>
      <label>RERA / broker registration number<input placeholder="Registration number and state/jurisdiction"></label>
      <label>GST, PAN and professional insurance<input placeholder="GST/PAN, insurer, policy number and expiry"></label>
      <label>Professional qualifications <i>*</i><input placeholder="Experience, certifications and professional memberships"></label>
      <label>Valuer / legal / lender or DSA credentials<input placeholder="Applicable licence, bar/valuer registration or lender/DSA authority"></label>
      <label>Office location and team capacity<input placeholder="Office location, specialists and field capacity"></label>
    </div><label class="plumbing-document-upload">Upload registration, professional credentials, insurance or work proof <i>*</i><input type="file" accept="application/pdf,image/jpeg,image/png" multiple><small>PDF, JPEG, or PNG · up to 4 files · 1.5 MB each</small></label></section>
    <section><h3>Service area & delivery</h3><div class="plumbing-grid">
      <label>Service city <i>*</i><input></label><label>PIN codes / service areas <i>*</i><input></label>
      <label>Property types and client segments <i>*</i><input placeholder="Residential, commercial, land, landlords, buyers, tenants or investors"></label>
      <label>Service scope and exclusions <i>*</i><input placeholder="What is included, excluded and handled by third parties"></label>
      <label>Property management process<input placeholder="Tenant/occupant screening, rent, inspections, maintenance and owner reporting"></label>
      <label>Property valuation process<input placeholder="Purpose, method, data sources, report timeline and limitations"></label>
      <label>Legal service process<input placeholder="Qualified professional, document review, drafting and escalation process"></label>
      <label>Home-loan assistance process<input placeholder="Lender/DSA relationship, documents, application support and no-guarantee notice"></label>
    </div></section>
    <section><h3>Pricing, disclosures & customer protection</h3><div class="plumbing-grid">
      <label>Starting consultation / site-visit charge<input placeholder="For example: ₹999"></label>
      <label>Commission / management / report fee policy <i>*</i><input placeholder="Fee, percentage, payment milestones and tax treatment"></label>
      <label>Lender partnerships and conflict disclosure<input placeholder="Partner lenders, referral/DSA arrangements and disclosures"></label>
      <label>Document, data and privacy handling <i>*</i><input placeholder="Consent, secure storage, sharing and retention process"></label>
      <label>Cancellation, refund, damage-claim and dispute process <i>*</i><input placeholder="Cancellations, refunds, claims, complaints and escalation"></label>
      <label>Advertising, listing and lead-handling consent <i>*</i><input placeholder="Consent for listings, photos, contact details and lead communication"></label>
    </div></section>
    <section><h3>Availability</h3><label>Working days <i>*</i><span class="plumbing-days">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => `<label><input type="checkbox" value="${day}"> ${day}</label>`).join('')}</span></label><div class="plumbing-grid"><label>Working hours <i>*</i><input placeholder="For example: 9:00 AM – 6:00 PM"></label><label class="plumbing-check"><input type="checkbox"> Emergency property support available</label></div></section>
    <section><h3>Bank details</h3><div class="plumbing-grid"><label>Account holder name <i>*</i><input></label><label>Account number <i>*</i><input inputmode="numeric"></label><label>IFSC <i>*</i><input></label><label>UPI ID<input></label></div></section>
    <section><h3>Agreements & declarations</h3><div class="plumbing-agreements">${policies.map(([text, href, required]) => `<label><input type="checkbox"> <a href="${href}" target="_blank" rel="noopener">${text}</a>${required ? ' <i>*</i>' : ''}</label>`).join('')}</div></section>
    <button class="button button-dark service-final-submit" type="button">Submit real estate services partner application <span>→</span></button>`;

  const actions = form.querySelector('.profile-actions');
  actions?.before(panel);
  let slot = actions?.querySelector('#serviceApprovalSlot');
  if (!slot && actions) {
    const fallback = actions.querySelector('#submitForApproval');
    if (fallback) { slot = document.createElement('span'); slot.id = 'serviceApprovalSlot'; slot.className = 'service-approval-slot'; slot._defaultApproval = fallback; fallback.replaceWith(slot); slot.append(fallback); }
  }
  const submit = panel.querySelector('button[type="button"]');
  const rows = panel.querySelector('#realEstateServicesRows');
  rows.innerHTML = services.map(service => `<label class="plumbing-row" data-service="${service}"><strong>${service}${regulated.has(service) ? '<small> Credential check required</small>' : ''}</strong><input type="number" min="0" placeholder="Years"><input type="number" min="0" placeholder="Consult ₹"></label>`).join('');
  const sync = () => {
    const active = [...document.querySelectorAll('#vendorServicesProducts option:checked')].map(option => option.value).filter(service => services.includes(service));
    const category = [document.querySelector('#vendorMainCategory')?.value, ...document.querySelectorAll('#vendorSubcategories option:checked')].map(value => value?.value || '').join(' ');
    panel.hidden = !active.length && !/real estate services|property services/i.test(category);
    rows.querySelectorAll('.plumbing-row').forEach(row => { const visible = active.includes(row.dataset.service); row.hidden = !visible; row.style.display = visible ? 'grid' : 'none'; });
    if (slot) { if (!panel.hidden) slot.replaceChildren(submit); else if (slot.contains(submit)) slot.replaceChildren(slot._defaultApproval); }
  };
  ['vendorMainCategory', 'vendorSubcategories', 'vendorServicesProducts'].forEach(id => document.querySelector(`#${id}`)?.addEventListener('change', sync));
  sync();
})();
