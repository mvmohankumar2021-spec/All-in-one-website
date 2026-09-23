(() => {
  const agreement = document.querySelector('#marketplaceAgreement');
  const label = agreement?.closest('.agreement-confirmation');
  if (!label || label.parentElement?.querySelector('.marketplace-policy-links')) return;
  agreement.checked = true;
  agreement.required = false;
  label.hidden = true;
  const policies = document.createElement('p');
  policies.className = 'marketplace-policy-links';
  policies.innerHTML = 'Marketplace policy: <a href="/legal/marketplace-payments-cancellation-refund-policy" target="_blank" rel="noopener">Review Payments, Cancellation &amp; Refund Policy</a>';
  label.after(policies);
})();
