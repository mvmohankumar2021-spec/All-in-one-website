(() => {
  const popover = document.createElement('div');
  popover.className = 'plumbing-help-popover';
  popover.hidden = true;
  document.body.append(popover);

  const labelText = (label) => [...label.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join(' ')
    .replace(/\s*\*\s*$/, '') || 'this field';

  document.querySelectorAll('.construction-onboarding label, .architecture-engineering-onboarding label, .interior-design-onboarding label, .flooring-cladding-onboarding label, .fabrication-metalwork-onboarding label, .building-materials-onboarding label, .real-estate-sales-onboarding label, .real-estate-rental-onboarding label, .accommodation-onboarding label, .real-estate-services-onboarding label').forEach(label => {
    if (label.closest('.plumbing-days, .plumbing-agreements') || label.classList.contains('plumbing-check') || label.querySelector('input[type="checkbox"]') || label.querySelector('.plumbing-help-button')) return;
    const input = label.querySelector(':scope > input, :scope > textarea');
    if (!input) return;
    const hint = (input.getAttribute('placeholder') || '').trim();
    const text = input.type === 'file'
      ? 'Upload clear supporting files in the accepted format. Your documents are reviewed before the service profile is activated.'
      : hint
        ? `${labelText(label)}: ${hint}`
        : `Enter accurate ${labelText(label).toLowerCase()}. This information is used to review and activate your service profile.`;
    label.classList.add('plumbing-help-label');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plumbing-help-button';
    button.textContent = 'ⓘ';
    button.title = text;
    button.setAttribute('aria-label', `Help for ${labelText(label)}`);
    button.addEventListener('click', () => {
      const rect = button.getBoundingClientRect();
      const width = Math.min(270, window.innerWidth - 24);
      const isOpen = !popover.hidden && popover.dataset.for === button.getAttribute('aria-label');
      popover.hidden = isOpen;
      if (isOpen) return;
      popover.dataset.for = button.getAttribute('aria-label');
      popover.textContent = text;
      popover.style.width = `${width}px`;
      popover.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width))}px`;
      popover.style.top = `${Math.min(window.innerHeight - 72, rect.bottom + 7)}px`;
      popover.hidden = false;
    });
    label.append(button);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.plumbing-help-button, .plumbing-help-popover')) popover.hidden = true;
  });
})();
