(() => {
  const markerStyle = document.createElement('style');
  markerStyle.textContent = '.required-marker{display:inline!important;align-self:baseline;color:#c2410c;font-weight:800;line-height:1;margin-left:4px}.has-required-marker{display:flex!important;flex-wrap:wrap;align-items:baseline;column-gap:0;row-gap:7px}.has-required-marker>input,.has-required-marker>select,.has-required-marker>textarea{flex:0 0 100%;width:100%}';
  document.head.append(markerStyle);
  const fieldSelector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="password"]), select, textarea';
  const labelText = (label) => [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).filter(Boolean).join(' ') || 'this field';
  const messageFor = (label, field) => label.dataset.help || label.querySelector('.upload-note, small:not(.optional)')?.textContent.trim() || field.dataset.help || field.getAttribute('placeholder') || `Provide ${labelText(label)}.`;
  const closeAll = () => { document.querySelectorAll('.global-help-detail').forEach((detail) => { detail.hidden = true; }); document.querySelectorAll('.global-help-button').forEach((button) => button.setAttribute('aria-expanded', 'false')); };
  document.querySelectorAll('label').forEach((label) => {
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
  document.addEventListener('click', (event) => { if (!event.target.closest('.global-help-button, .global-help-detail')) closeAll(); });
})();
