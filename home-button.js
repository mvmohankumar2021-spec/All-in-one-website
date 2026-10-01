(() => {
  if (!document.querySelector('script[data-theme-catalogue-loader]')) { const script = document.createElement('script'); script.src = 'theme-catalogue.js'; script.dataset.themeCatalogueLoader = 'true'; document.head.append(script); }
  if (location.pathname === '/' || location.pathname.endsWith('/index.html')) return;
  const header = document.querySelector('header');
  const nav = header?.querySelector('nav');
  const home = nav?.querySelector('a[href="index.html"], a[href="/"]') || document.createElement('a');
  // An explicit Home visit must not trigger signed-in workspace restoration.
  home.href = 'index.html#home';
  home.className = 'header-home-symbol';
  home.setAttribute('aria-label', 'Go to SHAKALPA homepage');
  home.title = 'Home';
  home.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
  // Keep Home only in the shared account-control row, not duplicated in the menu.
  if (home.parentElement) home.remove();

  const compactHome = home.cloneNode(true);
  compactHome.classList.add('header-home-mobile');
  if (header) {
    const controls = header.querySelector('.header-actions, .admin-actions');
    (controls || header).append(compactHome);
  } else {
    compactHome.classList.add('home-return-button');
    document.body.append(compactHome);
  }
})();
