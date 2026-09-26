(() => {
  const markerStyle = document.createElement('style');
  markerStyle.textContent = '.required-marker{display:inline!important;align-self:baseline;color:#c2410c;font-weight:800;line-height:1;margin-left:4px}.has-required-marker{display:flex!important;flex-wrap:wrap;align-items:baseline;column-gap:0;row-gap:7px}.has-required-marker>input,.has-required-marker>select,.has-required-marker>textarea{flex:0 0 100%;width:100%}';
  document.head.append(markerStyle);
  const fieldSelector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="password"]), select, textarea';
  const labelText = (label) => [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).filter(Boolean).join(' ') || 'this field';
  const messageFor = (label, field) => label.dataset.help || label.querySelector('.upload-note, small:not(.optional)')?.textContent.trim() || field.dataset.help || field.getAttribute('placeholder') || `Provide ${labelText(label)}.`;
  const closeAll = () => { document.querySelectorAll('.global-help-detail').forEach((detail) => { detail.hidden = true; }); document.querySelectorAll('.global-help-button').forEach((button) => button.setAttribute('aria-expanded', 'false')); };
  document.querySelectorAll('label').forEach((label) => {
    if (label.closest('.electrical-service-grid, .plumbing-onboarding')) return;
    if (label.querySelector('.required-marker')) label.classList.add('has-required-marker');
    const requiredField = label.querySelector('input[required]:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), select[required], textarea[required]');
    if (requiredField && !label.querySelector('.required-marker')) {
      const marker = document.createElement('span');
      marker.className = 'required-marker';
      marker.textContent = '*';
      marker.setAttribute('aria-hidden', 'true');
      const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.after(marker);
      else label.prepend(marker);
      label.classList.add('has-required-marker');
    }
    const field = label.querySelector(fieldSelector);
    if (!field || label.querySelector('.field-help-button, .global-help-button')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'global-help-button'; button.textContent = 'ⓘ'; button.setAttribute('aria-label', `Help for ${labelText(label)}`); button.setAttribute('aria-expanded', 'false');
    const detail = document.createElement('span'); detail.className = 'global-help-detail'; detail.textContent = messageFor(label, field); detail.hidden = true;
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); const show = detail.hidden; closeAll(); detail.hidden = !show; button.setAttribute('aria-expanded', String(show)); });
    label.classList.add('global-help-label'); label.append(button, detail);
  });
  // Use one viewport-level popover for every help icon. Field-level popovers can
  // otherwise be clipped by cards and scrolling form panels.
  const popover = document.createElement('div');
  popover.className = 'universal-help-popover'; popover.hidden = true;
  popover.setAttribute('role', 'tooltip'); document.body.append(popover);
  const helpSelector = '.global-help-button, .field-help-button, .electrical-section-help';
  const helpText = (button) => button.parentElement?.querySelector('.global-help-detail, .field-help-detail, .electrical-section-help-detail')?.textContent.trim() || button.getAttribute('aria-label') || 'More information is available for this field.';
  document.querySelectorAll(helpSelector).forEach((button) => { button.title = helpText(button); });
  const hidePopover = () => { popover.hidden = true; document.querySelectorAll(helpSelector).forEach((button) => button.setAttribute('aria-expanded', 'false')); closeAll(); };
  document.addEventListener('click', (event) => {
    const button = event.target.closest(helpSelector);
    if (!button) { if (!event.target.closest('.universal-help-popover')) hidePopover(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    const wasOpen = !popover.hidden && popover.dataset.owner === button.getAttribute('aria-label');
    if (wasOpen) { hidePopover(); return; }
    hidePopover();
    popover.textContent = helpText(button); popover.dataset.owner = button.getAttribute('aria-label') || '';
    const rect = button.getBoundingClientRect(); const width = Math.min(290, window.innerWidth - 24);
    popover.style.width = `${width}px`; popover.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width))}px`;
    popover.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + 8)}px`;
    popover.hidden = false; button.setAttribute('aria-expanded', 'true');
  }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hidePopover(); });
  // Keep each form's own tooltip handlers and positioning. Standardize only
  // the icon artwork, including controls created after this script runs.
  const iconSelector = 'button.global-help-button, button.field-help-button, button.plumbing-help-button, button.electrical-section-help, button.plumbing-section-help';
  const iconStyles = document.createElement('link');
  iconStyles.rel = 'stylesheet'; iconStyles.href = '/shared-help-icons.css'; document.head.append(iconStyles);
  const onboardingStyles = document.createElement('link');
  onboardingStyles.rel = 'stylesheet'; onboardingStyles.href = '/onboarding-compact.css'; document.head.append(onboardingStyles);
  function styleHelpIcons(root) {
    const buttons = [...(root.matches?.(iconSelector) ? [root] : []), ...root.querySelectorAll(iconSelector)];
    buttons.forEach(button => {
      if (button.dataset.sharedHelpIcon) return;
      button.dataset.sharedHelpIcon = 'true';
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', button.title || 'Help for this field');
      button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg>';
      const label = button.parentElement;
      // Regular fields use the same label-adjacent icon as Catering. Service
      // experience tables retain their dedicated help column.
      if (label?.matches('label') && label.closest('.plumbing-onboarding,.electrical-onboarding') && !label.closest('.plumbing-row,.electrical-service-grid')) {
        const input = label.querySelector(':scope > input:not([type=checkbox]),:scope > textarea,:scope > select');
        if (input) { label.classList.add('compact-help-field'); input.before(button); }
      }
    });
  }
  styleHelpIcons(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) styleHelpIcons(node); }));
  }).observe(document.body, {childList: true, subtree: true});
  // Older form handlers use a fixed estimated tooltip height. Clamp the actual
  // rendered card so longer guidance remains readable near viewport edges.
  const cardSelector = '.universal-help-popover,.plumbing-help-popover,.bakery-help-tooltip';
  let helpFrame;
  function fitHelpCards() {
    cancelAnimationFrame(helpFrame);
    helpFrame = requestAnimationFrame(() => {
      document.querySelectorAll(cardSelector).forEach(card => {
        if (card.hidden || !card.getClientRects().length) return;
        const rect = card.getBoundingClientRect();
        const anchor = document.activeElement?.matches(iconSelector) ? document.activeElement.getBoundingClientRect() : null;
        const left = Math.max(12, Math.min(anchor ? anchor.left : rect.left, window.innerWidth - rect.width - 12));
        const below = anchor ? anchor.bottom + 6 : rect.top;
        const preferredTop = anchor && below + rect.height > window.innerHeight - 12 ? anchor.top - rect.height - 6 : below;
        const top = Math.max(12, Math.min(preferredTop, window.innerHeight - rect.height - 12));
        if (Math.abs(rect.left - left) > .5) card.style.left = `${left}px`;
        if (Math.abs(rect.top - top) > .5) card.style.top = `${top}px`;
      });
    });
  }
  new MutationObserver(records => {
    if (records.some(record => record.target.matches?.(cardSelector))) fitHelpCards();
  }).observe(document.body, {attributes: true, attributeFilter: ['hidden', 'style'], childList: true, subtree: true});
  window.addEventListener('resize', fitHelpCards);
  // Some panels are created after the initial help pass; others reuse their
  // fields for different services. Fill missing help without replacing existing
  // handlers or duplicating icons, and derive new hints when the label changes.
  const servicePanels = '.plumbing-onboarding,.electrical-onboarding';
  function serviceFieldLabel(label) {
    return [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).join(' ').replace(/\s*\*\s*/g, ' ').trim();
  }
  function serviceHint(label, field) {
    const name = serviceFieldLabel(label) || field.getAttribute('aria-label') || 'this field';
    const instructions = {
      'city': 'Enter the main city where you provide this service.',
      'pin codes / service areas': 'List the PIN codes or localities you serve, separated by commas.',
      'maximum travel radius': 'Enter the maximum distance you travel from your service location, in kilometres.',
      'working hours': 'State your opening and closing times, including any breaks or different weekend hours.',
      'account holder name': 'Enter the name exactly as shown on the payout bank account.',
      'account number': 'Enter the payout bank account number carefully. Do not enter a card number or PIN.',
      'ifsc': 'Enter the 11-character IFSC from your bank account details.',
      'upi id': 'Optional: enter your UPI ID, not a UPI PIN.',
      'warranty / revisit policy': 'Describe the coverage period, exclusions and any revisit charges.',
      'damage-claim policy': 'Explain how customers report damage, what evidence is needed and how claims are reviewed.'
    };
    if (field.type === 'file') return 'Choose clear PDF, JPEG or PNG supporting documents. Upload up to 4 files at a time, each no larger than 1.5 MB. Check the upload confirmation before submitting.';
    if (instructions[name.toLowerCase()]) return instructions[name.toLowerCase()];
    const hint = field.dataset.help || label.dataset.help || field.getAttribute('placeholder');
    if (hint) return hint;
    if (/qualification|experience/i.test(name)) return `Describe your relevant training, qualifications or practical experience for the selected service. Attach supporting proof where required.`;
    if (/licen[cs]e|registration|insurance/i.test(name)) return 'Provide the relevant reference number, issuing authority/provider and validity where applicable. Do not repeat documents already uploaded.';
    if (/charge|price/i.test(name)) return 'Enter the amount in rupees and explain what it covers, including any additional charges.';
    if (/material/i.test(name)) return 'Explain whether materials are included or quoted separately, and who supplies them.';
    return `Provide ${name.toLowerCase()} for the selected service. Include any relevant limits or conditions.`;
  }
  function completeServiceHelp() {
    document.querySelectorAll(servicePanels).forEach(panel => {
      panel.querySelectorAll('label').forEach(label => {
        if (label.closest('.plumbing-row,.electrical-service-grid,.plumbing-days,.electrical-days,.plumbing-agreements,.electrical-agreements')) return;
        const field = label.querySelector(':scope > input:not([type=checkbox]):not([type=radio]):not([type=hidden]),:scope > textarea,:scope > select');
        if (!field) return;
        const existing = label.querySelector(iconSelector);
        if (existing && !existing.dataset.generatedServiceHelp) return;
        const text = serviceHint(label, field);
        if (existing) {
          const detail = label.querySelector('.global-help-detail');
          if (detail && detail.textContent !== text) detail.textContent = text;
          const name = `Help for ${serviceFieldLabel(label) || 'this field'}`;
          if (existing.getAttribute('aria-label') !== name) existing.setAttribute('aria-label', name);
          return;
        }
        const button = document.createElement('button'); button.type = 'button'; button.className = 'global-help-button';
        button.dataset.generatedServiceHelp = 'true'; button.setAttribute('aria-label', `Help for ${serviceFieldLabel(label) || 'this field'}`); button.setAttribute('aria-expanded', 'false');
        const detail = document.createElement('span'); detail.className = 'global-help-detail'; detail.hidden = true; detail.textContent = text;
        label.append(button, detail); styleHelpIcons(label);
      });
      // One row-level icon explains the paired experience/price inputs without
      // adding another column for each input.
      panel.querySelectorAll('.plumbing-row,.electrical-service-grid > label').forEach(row => {
        if (row.querySelector(iconSelector)) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'global-help-button service-row-help';
        button.setAttribute('aria-label', `Help for ${row.dataset.service || row.querySelector('strong,span')?.textContent.trim() || 'service experience and price'}`);
        button.setAttribute('aria-expanded', 'false');
        const hint = document.createElement('span'); hint.className = 'global-help-detail'; hint.hidden = true;
        hint.textContent = 'Enter completed years of relevant experience and your starting price in rupees for this service. Zero years is allowed for a new business; explain additional charges in the pricing section.';
        row.append(button, hint); styleHelpIcons(row);
      });
    });
  }
  let completionQueued = false;
  function scheduleCompletion() {
    if (completionQueued) return;
    completionQueued = true;
    queueMicrotask(() => { completionQueued = false; completeServiceHelp(); });
  }
  completeServiceHelp();
  new MutationObserver(records => {
    if (records.some(r => r.target.closest?.(servicePanels) || [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches(servicePanels) || n.querySelector(servicePanels))))) scheduleCompletion();
  }).observe(document.body, {childList:true, characterData:true, subtree:true});
  document.querySelector('#vendorServicesProducts')?.addEventListener('change', scheduleCompletion);
})();
