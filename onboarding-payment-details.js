(() => {
  const removeDuplicateBankSections = () => {
    document.querySelectorAll('.plumbing-onboarding, .electrical-onboarding').forEach(panel => {
      panel.querySelectorAll('section, .electrical-section').forEach(section => {
        const heading = section.querySelector(':scope > h3');
        if (heading?.textContent.trim().toLowerCase() === 'bank details') section.hidden = true;
      });
      panel.querySelectorAll('.plumbing-flow, .electrical-flow').forEach(flow => {
        flow.textContent = flow.textContent.replace(/\s*→\s*Bank details/gi, '');
      });
    });
  };
  removeDuplicateBankSections();
  window.setTimeout(removeDuplicateBankSections, 0);
})();
