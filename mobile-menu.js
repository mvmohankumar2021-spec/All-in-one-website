(() => {
  const menuIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  document.querySelectorAll('header nav').forEach((nav, index) => {
    if (nav.dataset.mobileMenuReady === 'true') return;
    nav.dataset.mobileMenuReady = 'true';
    const header = nav.closest('header');
    if (!header) return;
    const id = nav.id || `shakalpa-mobile-nav-${index + 1}`;
    nav.id = id;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-menu-toggle';
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.setAttribute('aria-controls', id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = menuIcon;

    const homeLocationBar = header.classList.contains('site-header') && document.querySelector('.home-product-search');
    const controls = header.querySelector('.header-actions');
    if (homeLocationBar) homeLocationBar.prepend(toggle);
    else if (controls) controls.prepend(toggle);
    else header.append(toggle);

    const close = () => {
      nav.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    };
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('mobile-nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
  });
})();
