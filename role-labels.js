(() => {
  const roleNames = { Customer: 'SHAKALPA Member', Vendor: 'SHAKALPA Partner', Agent: 'SHAKALPA Associate' };
  const roleLabel = (value) => roleNames[value] || value;
  const replaceRoleLabel = (value) => String(value).replace(/\b(Customer|Vendor|Agent)(s)?\b/g, (_, role, plural) => `${roleNames[role]}${plural ? 's' : ''}`);
  const ignoredTags = new Set(['SCRIPT', 'STYLE']);

  const relabelNode = (root) => {
    const element = root?.nodeType === Node.ELEMENT_NODE ? root : root?.parentElement;
    if (!root || (element && (ignoredTags.has(element.tagName) || element.closest('[data-preserve-user-name]')))) return;
    const textNodes = [];
    if (root.nodeType === Node.TEXT_NODE) textNodes.push(root);
    else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) textNodes.push(walker.currentNode);
    }
    textNodes.forEach((node) => {
      if (ignoredTags.has(node.parentElement?.tagName) || node.parentElement?.closest('[data-preserve-user-name]')) return;
      const label = replaceRoleLabel(node.nodeValue);
      if (label !== node.nodeValue) node.nodeValue = label;
    });
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    root.querySelectorAll?.('[aria-label],[title],[placeholder]').forEach((element) => {
      ['aria-label', 'title', 'placeholder'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const label = replaceRoleLabel(element.getAttribute(attribute));
        if (label !== element.getAttribute(attribute)) element.setAttribute(attribute, label);
      });
    });
  };

  relabelNode(document.body);
  new MutationObserver((records) => records.forEach((record) => {
    if (record.type === 'characterData') relabelNode(record.target);
    record.addedNodes.forEach(relabelNode);
  })).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.ShakalpaRoleLabels = { roleLabel, relabel: () => relabelNode(document.body) };
})();
