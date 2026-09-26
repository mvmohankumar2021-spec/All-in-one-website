(() => {
  const panel = document.querySelector('.bakery-onboarding');
  if (!panel) return;
  const tooltip = document.createElement('div');
  tooltip.className = 'bakery-help-tooltip'; tooltip.hidden = true;
  document.body.append(tooltip);
  panel.querySelectorAll('label').forEach(label => {
    const input = label.querySelector('input, select, textarea');
    if (!input || input.type === 'checkbox' || label.querySelector('.plumbing-help-button')) return;
    const placeholder = input.getAttribute('placeholder');
    const message = placeholder || `Enter accurate ${label.childNodes[0]?.textContent?.trim().toLowerCase() || 'details'} for this bakery service.`;
    if (placeholder) input.removeAttribute('placeholder');
    label.classList.add('plumbing-help-label');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'plumbing-help-button'; button.textContent = 'ⓘ';
    button.title = message; button.setAttribute('aria-label', message);
    button.addEventListener('click', () => {
      const rect = button.getBoundingClientRect();
      const isOpen = !tooltip.hidden && tooltip.dataset.for === message;
      tooltip.hidden = isOpen;
      if (isOpen) return;
      tooltip.textContent = message; tooltip.dataset.for = message;
      tooltip.style.left = `${Math.max(12, Math.min(window.innerWidth - 282, rect.right - 270))}px`;
      tooltip.style.top = `${Math.min(window.innerHeight - 72, rect.bottom + 8)}px`;
      tooltip.hidden = false;
    });
    label.append(button);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.plumbing-help-button, .bakery-help-tooltip')) tooltip.hidden = true; });
})();
