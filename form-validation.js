(() => {
  const controls = 'input, select, textarea';
  const visible = field => !field.disabled && field.type !== 'hidden' &&
    !field.closest('[hidden]') && (field.getClientRects().length > 0 ||
      (field.type === 'file' && field.closest('label')?.getClientRects().length > 0));
  const labelFor = field => {
    const label = field.closest('label') || field.labels?.[0];
    if (!label) return field.getAttribute('aria-label') || field.name || 'This field';
    const copy = label.cloneNode(true);
    copy.querySelectorAll('input,select,textarea,button,small,.field-help-detail,.global-help-detail').forEach(node => node.remove());
    return copy.textContent.replace(/[＊*ⓘ]/g, '').trim().replace(/\s+/g, ' ') || 'This field';
  };
  const errorFor = field => {
    const label = field.closest('label');
    const marked = label && [...label.children].some(node =>
      node.matches('i,.required-marker') && node.textContent.includes('*'));
    const required = field.required || marked;
    if (required && ((field.type === 'checkbox' && !field.checked) ||
      (field.type === 'radio' && ![...(field.form || document).querySelectorAll('input[type="radio"]')].some(other => other.name === field.name && other.checked)) ||
      (field.type === 'file' && !field.files.length && field.dataset.uploaded !== 'true') ||
      (!['checkbox','radio','file'].includes(field.type) && !field.value.trim()))) {
      return `${labelFor(field)} is required.`;
    }
    if (!field.validity || field.validity.valid) return '';
    // Browser-native validation text follows the browser language, not the app.
    const validity = field.validity;
    if (validity.customError) return `${labelFor(field)}: ${window.AppI18n?.t(field.validationMessage) || field.validationMessage}`;
    let message = 'Enter a valid value.';
    if (validity.typeMismatch) message = field.type === 'email' ? 'Enter a valid email address.' : 'Enter a valid URL.';
    else if (validity.badInput) message = 'Enter a valid number.';
    else if (validity.rangeUnderflow) message = 'The value is below the allowed minimum.';
    else if (validity.rangeOverflow) message = 'The value exceeds the allowed maximum.';
    else if (validity.stepMismatch) message = 'Use a value matching the allowed increments.';
    else if (validity.tooShort) message = 'The entry is too short.';
    else if (validity.tooLong) message = 'The entry is too long.';
    else if (validity.patternMismatch) message = 'Use the required format shown in the field help.';
    const translated = window.AppI18n && window.AppI18n.language !== 'en';
    return `${labelFor(field)}: ${translated ? window.AppI18n.t(message) : field.validationMessage}`;
  };
  function show(scope, field, message) {
    let summary = scope.querySelector(':scope > .validation-summary');
    if (!summary) {
      summary = document.createElement('p'); summary.className = 'validation-summary';
      summary.setAttribute('role', 'alert'); scope.prepend(summary);
    }
    summary.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    const target = field.getClientRects().length ? field : field.closest('label')?.querySelector('button');
    (target || summary).scrollIntoView({block:'center', behavior:'smooth'});
    target?.focus({preventScroll:true});
  }
  function validate(scope, event) {
    const fields = [...scope.querySelectorAll(controls)].filter(visible);
    for (const field of fields) {
      const error = errorFor(field);
      if (error) { event.preventDefault(); event.stopImmediatePropagation(); show(scope, field, error); return false; }
    }
    scope.querySelector(':scope > .validation-summary')?.remove();
    return true;
  }
  document.addEventListener('submit', event => validate(event.target, event), true);
  document.addEventListener('invalid', event => {
    if (!visible(event.target)) return;
    event.preventDefault();
    const scope = event.target.form;
    if (scope) {
      const first = [...scope.querySelectorAll(controls)].filter(visible).find(field => errorFor(field));
      if (first === event.target) show(scope, first, errorFor(first));
    }
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('.service-final-submit, #submitForApproval');
    if (!button) return;
    const form = button.closest('form') || document.querySelector('#vendorProfileForm');
    if (form) validate(form, event);
  }, true);
  document.addEventListener('input', event => {
    if (event.target.matches(controls) && !errorFor(event.target)) event.target.removeAttribute('aria-invalid');
  });
  const style = document.createElement('style');
  style.textContent = '.validation-summary{padding:12px 14px;border:1px solid #d99a91;border-left:4px solid #b42318;border-radius:6px;background:#fff1ef;color:#8f2018;font:600 14px/1.5 sans-serif;grid-column:1/-1}input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"]{border-color:#b42318!important;outline:2px solid #b4231833;outline-offset:1px}';
  document.head.append(style);
})();
