(() => {
  document.querySelectorAll('.plumbing-onboarding, .electrical-onboarding').forEach(panel => {
    panel.querySelectorAll('label').forEach(label => {
      const field = label.querySelector('input[placeholder], select[placeholder], textarea[placeholder]');
      const help = label.querySelector('.plumbing-help-button, .field-help-button, button[aria-label^="Help"]');
      if (field && help) field.removeAttribute('placeholder');
    });
  });
})();
