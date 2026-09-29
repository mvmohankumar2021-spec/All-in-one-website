/* Approver-only review UI. The server independently validates the review token. */
(() => {
  const checked = new Map();
  const priorFetch = window.fetch.bind(window);
  window.fetch = (resource, options = {}) => {
    if (resource === '/api/reviews/vendor-approve' && options.method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      const review = checked.get(Number(payload.accountId));
      if (review?.input.checked) {
        payload.healthcareCredentialsVerified = true;
        payload.healthcareReviewToken = review.token;
      }
      options = {...options, body: JSON.stringify(payload)};
    }
    return priorFetch(resource, options);
  };
  async function mount(button) {
    if (button.dataset.healthReviewMounted) return;
    button.dataset.healthReviewMounted = 'true';
    const accountId = Number(button.dataset.approveId);
    checked.delete(accountId);
    const response = await priorFetch(`/api/reviews/healthcare-onboarding?accountId=${accountId}`);
    if (!response.ok) return;
    const review = await response.json();
    if (!review.required || !button.isConnected) return;
    const schemaResponse = await priorFetch('/retail-schema.json');
    if (!schemaResponse.ok) return;
    const schema = await schemaResponse.json();
    const labels = Object.fromEntries([...schema.sections.flatMap(section=>section.fields), ...Object.values(schema.specific)].map(field=>[field[0],field[1]]));
    const box = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Review healthcare credentials'; summary.dataset.i18n = '';
    const state = document.createElement('p'); state.textContent = review.status; state.dataset.i18n = '';
    box.append(summary,state);
    for (const [key,value] of Object.entries(review.details)) {
      if (!labels[key]) continue;
      const item = document.createElement('p'), title = document.createElement('strong'), content = document.createElement('span');
      title.textContent = labels[key]; title.dataset.i18n = '';
      content.textContent = String(value); content.translate = false;
      item.append(title,document.createElement('br'),content); box.append(item);
    }
    const label = document.createElement('label'), input = document.createElement('input'), words = document.createElement('span');
    input.type = 'checkbox'; input.disabled = review.status !== 'Application Submitted';
    words.textContent = 'I verified facility and practitioner credentials, approvals, publication consent and advertised capabilities against the supporting evidence.';
    words.dataset.i18n = ''; label.append(input,words); box.append(label);
    box.style.cssText = 'min-width:220px;max-width:560px;white-space:normal;overflow-wrap:anywhere';
    label.style.cssText = 'display:flex;align-items:flex-start;gap:8px';
    input.style.cssText = 'width:16px;height:16px;flex-shrink:0';
    button.before(box); checked.set(accountId,{input,token:review.token});
  }
  const refresh = () => document.querySelectorAll('#vendorApprovalRows [data-approve-id]').forEach(button=>mount(button).catch(()=>{delete button.dataset.healthReviewMounted;}));
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
  refresh();
})();
