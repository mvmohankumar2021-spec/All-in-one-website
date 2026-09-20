(() => {
  const markerStyle = document.createElement('style');
  markerStyle.textContent = '.required-marker{display:inline!important;align-self:baseline;color:#c2410c;font-weight:800;line-height:1;margin-left:4px}.has-required-marker{display:flex!important;flex-wrap:wrap;align-items:baseline;column-gap:0;row-gap:7px}.has-required-marker>input,.has-required-marker>select,.has-required-marker>textarea{flex:0 0 100%;width:100%}';
  document.head.append(markerStyle);
  const fieldSelector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="password"]), select, textarea';
  const labelText = (label) => [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).filter(Boolean).join(' ') || 'this field';
  const messageFor = (label, field) => label.dataset.help || label.querySelector('.upload-note, small:not(.optional)')?.textContent.trim() || field.dataset.help || field.getAttribute('placeholder') || `Provide ${labelText(label)}.`;
  const closeAll = () => { document.querySelectorAll('.global-help-detail').forEach((detail) => { detail.hidden = true; }); document.querySelectorAll('.global-help-button').forEach((button) => button.setAttribute('aria-expanded', 'false')); };
  document.querySelectorAll('label').forEach((label) => {
    if (label.closest('.electrical-service-grid')) return;
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
})();
