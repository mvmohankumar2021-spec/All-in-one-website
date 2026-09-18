(() => {
  if (location.pathname === '/' || location.pathname.endsWith('/index.html')) return;
  const nav = document.querySelector('header nav');
  if (!nav) return;
  const home = nav.querySelector('a[href="index.html"], a[href="/"]') || document.createElement('a');
  if (!home.parentElement) home.href = 'index.html';
  home.className = 'header-home-symbol';
  home.setAttribute('aria-label', 'Go to SHAKALPA homepage');
  home.title = 'Home';
  home.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
  nav.append(home);
})();
