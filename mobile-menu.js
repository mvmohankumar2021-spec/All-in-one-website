(() => {
  // Keep visual and keyboard order identical even when account controls arrive asynchronously.
  const controlOrder = ['.header-home-symbol', '.header-chat-symbol', '.account-workspace-link', '.cart-symbol', '#language-control', '.theme-icon-button', '.account-profile', '.signout-symbol'];
  function orderAccountControls() {
    document.querySelectorAll('header .header-actions, header .admin-actions').forEach(host => {
      const controls = [...host.children].filter(node => controlOrder.some(selector => node.matches(selector)));
      const sorted = [...controls].sort((a, b) => controlOrder.findIndex(selector => a.matches(selector)) - controlOrder.findIndex(selector => b.matches(selector)));
      if (controls.some((node, index) => node !== sorted[index])) sorted.forEach(node => host.append(node));
    });
  }
  new MutationObserver(orderAccountControls).observe(document.body, {childList: true, subtree: true});
  orderAccountControls();
  function placeLanguageControl() {
    const control = document.getElementById('language-control');
    const target = document.querySelector('.workspace-topbar .admin-actions, header .header-actions');
    if (!control || !target || control.classList.contains('language-icon-control')) return;
    control.classList.add('language-icon-control');
    const select = control.querySelector('select');
    const hint = 'Choose language / மொழியைத் தேர்ந்தெடுக்கவும் / भाषा चुनें';
    control.title = hint;
    select?.setAttribute('title', hint);
    select?.setAttribute('aria-label', hint);
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg>';
    control.prepend(icon);
    target.prepend(control);
  }
  document.addEventListener('DOMContentLoaded', placeLanguageControl);
  document.addEventListener('languagechange', placeLanguageControl);
  const menuIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  document.querySelectorAll('.admin-sidebar .admin-nav').forEach((nav, index) => {
    if (nav.dataset.workspaceMenuReady) return;
    nav.dataset.workspaceMenuReady = 'true';
    if (document.querySelector('#vendorProfileForm')) {
      const rank = link => {
        const href = link.getAttribute('href');
        return ['#business', 'index.html#shop', 'index.html#services', 'index.html#tracking', 'vendor-team.html', 'policy-centre.html'].indexOf(href);
      };
      const reorder = () => {
        const links = [...nav.querySelectorAll(':scope > a')].filter(link => rank(link) >= 0);
        const sorted = [...links].sort((a, b) => rank(a) - rank(b));
        if (links.some((link, index) => link !== sorted[index])) sorted.forEach(link => nav.append(link));
      };
      reorder();
      new MutationObserver(reorder).observe(nav, {childList: true});
    }
    nav.id ||= `workspace-navigation-${index}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'workspace-menu-toggle';
    toggle.innerHTML = menuIcon;
    toggle.setAttribute('aria-controls', nav.id);
    const setOpen = open => {
      nav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };
    setOpen(false);
    nav.before(toggle);
    const sidebar = nav.closest('.admin-sidebar');
    const actions = document.querySelector('.admin-header .admin-actions');
    const brand = sidebar.querySelector('.brand');
    if (brand && actions) {
      const topbar = document.createElement('header');
      topbar.className = 'workspace-topbar';
      brand.setAttribute('aria-label', 'SHAKALPA home');
      brand.title = 'SHAKALPA';
      sidebar.prepend(topbar);
      topbar.append(brand, toggle, actions);
      document.body.classList.add('workspace-top-layout');
    }
    toggle.addEventListener('click', () => setOpen(nav.hidden));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
    nav.parentElement.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !nav.hidden) { setOpen(false); toggle.focus(); }
    });
  });

  document.querySelectorAll('header').forEach(header => {
    const brand = header.querySelector(':scope > .brand');
    if (!brand || header.classList.contains('workspace-topbar')) return;
    header.classList.add('app-topbar');
    brand.setAttribute('aria-label', 'SHAKALPA home');
    brand.title = 'SHAKALPA';
    let controls = header.querySelector('.header-actions');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'header-actions';
      header.append(controls);
    }
    header.querySelectorAll(':scope > .header-home-mobile, :scope > .header-chat-symbol, :scope > .signout-symbol, :scope > .rides-help').forEach(control => controls.append(control));
  });

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

    const brand = header.querySelector(':scope > .brand');
    if (brand) brand.after(toggle);
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
    header.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('mobile-nav-open')) { close(); toggle.focus(); }
    });
  });
  placeLanguageControl();
})();
