(() => {
  const icon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/></svg>';

  function styleSymbol(button) {
    button.classList.add('signout-symbol');
    button.setAttribute('aria-label', 'Sign out');
    button.title = 'Sign out';
    button.innerHTML = icon;
  }

  async function signOut() {
    try { await fetch('/api/signout', { method: 'POST', credentials: 'same-origin' }); } catch (_) { /* Always clear local view state. */ }
    sessionStorage.removeItem('shakalpaAdminVendorView');
    window.location.href = 'index.html';
  }

  async function addSignOutControl() {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin' });
      const session = await response.json();
      if (!session.authenticated) return;

      const existing = document.querySelector('#logoutButton');
      if (existing) { styleSymbol(existing); return; }

      const signIn = document.querySelector('#signInButton');
      if (signIn) {
        signIn.hidden = true;
        document.querySelector('.header-signup')?.setAttribute('hidden', '');
      }

      const button = document.createElement('button');
      button.type = 'button';
      styleSymbol(button);
      button.addEventListener('click', signOut);

      const container = document.querySelector('.header-actions') || document.querySelector('header nav') || document.querySelector('header');
      if (container) container.append(button);
      else { button.classList.add('global-signout-symbol'); document.body.append(button); }
    } catch (_) { /* The public pages still work when the local server is unavailable. */ }
  }

  addSignOutControl();
})();
