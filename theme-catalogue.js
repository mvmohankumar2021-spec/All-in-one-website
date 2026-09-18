(() => {
  const storageKey = 'shakalpa-theme', modeKey = 'shakalpa-mode';
  const themes = [
    { id: 'navy', name: 'Midnight Sapphire', group: 'Dark themes' }, { id: 'emerald', name: 'Emerald Reserve', group: 'Dark themes' },
    { id: 'plum', name: 'Plum Atelier', group: 'Dark themes' }, { id: 'ocean', name: 'Ocean Ledger', group: 'Dark themes' },
    { id: 'charcoal', name: 'Charcoal Studio', group: 'Dark themes' }, { id: 'ruby', name: 'Ruby Noir', group: 'Dark themes' },
    { id: 'forest', name: 'Forest Mist', group: 'Dark themes' }, { id: 'sand', name: 'Sandstone', group: 'Light themes' },
    { id: 'indigo', name: 'Indigo Dawn', group: 'Dark themes' }, { id: 'coral', name: 'Coral Harbour', group: 'Light themes' },
    { id: 'lilac', name: 'Lilac Gallery', group: 'Light themes' }, { id: 'jade', name: 'Jade Horizon', group: 'Dark themes' },
    { id: 'sunset', name: 'Sunset Terrace', group: 'Light themes' }, { id: 'ice', name: 'Ice Blue', group: 'Light themes' },
    { id: 'mocha', name: 'Mocha House', group: 'Dark themes' }, { id: 'ivory', name: 'Ivory Linen', group: 'Light themes' },
    { id: 'blossom', name: 'Blossom Silk', group: 'Light themes' }, { id: 'mist', name: 'Silver Mist', group: 'Light themes' },
    { id: 'onyx', name: 'Onyx Gold', group: 'Dark themes' }, { id: 'obsidian', name: 'Obsidian Teal', group: 'Dark themes' },
    { id: 'nightfall', name: 'Nightfall Violet', group: 'Dark themes' }, { id: 'aurora', name: 'Aurora', group: 'Dark themes' },
    { id: 'citrus', name: 'Citrus Paper', group: 'Light themes' }, { id: 'shakalpa-green', name: 'Shakalpa Green', group: 'Light themes' }, { id: 'evergreen', name: 'Evergreen Dark', group: 'Dark themes' }, { id: 'rosewood', name: 'Rosewood', group: 'Dark themes' },
    { id: 'cloud', name: 'Cloud Slate', group: 'Light themes' }
  ];
  const generatedTheme = (id, name, group, ink, cream, accent, orange, glow) => ({ id, name, group, palette: { '--ink': ink, '--cream': cream, '--lime': accent, '--orange': orange, '--blue': accent, '--muted': ink, '--line': glow, '--glow': glow, '--header-bg': cream, '--dark-start': ink, '--dark-end': ink, '--accent-start': accent, '--accent-end': accent, '--accent-ink': '#fff', '--icon-hover': glow, '--field-line': glow, '--field-hover': accent, '--hero-start': glow, '--hero-end': cream, '--admin-start': ink, '--admin-end': ink, '--modal-line': glow } });
  themes.push(
    generatedTheme('alabaster', 'Alabaster Blue', 'Light themes', '#33445c', '#fffefb', '#6686b8', '#cb7562', '#edf1f7'),
    generatedTheme('lavender', 'Lavender Air', 'Light themes', '#4a4166', '#fdfbff', '#927cc8', '#d27680', '#eee9f8'),
    generatedTheme('peach', 'Peach Paper', 'Light themes', '#513d36', '#fffaf6', '#d38b68', '#cb6e5a', '#f8e9df'),
    generatedTheme('butter', 'Buttercream', 'Light themes', '#4c472d', '#fffef7', '#b1a13d', '#d07c4f', '#f4efc7'),
    generatedTheme('pistachio', 'Pistachio', 'Light themes', '#35452f', '#fbfff8', '#83a85e', '#d17858', '#e8f0d8'),
    generatedTheme('sky', 'Sky Paper', 'Light themes', '#314a5b', '#f8fdff', '#5fabc7', '#cf745e', '#dff2f8'),
    generatedTheme('sepia', 'Sepia Journal', 'Light themes', '#513d2d', '#fffaf1', '#b58a54', '#c66b4f', '#f1e1c8'),
    generatedTheme('pearl', 'Pearl Grey', 'Light themes', '#414750', '#fdfdfd', '#83929f', '#c97965', '#eef0f2'),
    generatedTheme('mint', 'Mint Leaf', 'Light themes', '#2f4d46', '#f8fffc', '#5eaf92', '#d0765b', '#dcf1e8'),
    generatedTheme('powder', 'Powder Blue', 'Light themes', '#3a4d64', '#f9fbff', '#7c9cd1', '#cf7281', '#e6edf9'),
    generatedTheme('cobalt', 'Cobalt Night', 'Dark themes', '#1e3161', '#f8faff', '#4e79da', '#d47665', '#dfe7fa'),
    generatedTheme('graphite', 'Graphite', 'Dark themes', '#33363a', '#fafafa', '#78818a', '#c47161', '#e5e7e8'),
    generatedTheme('mahogany', 'Mahogany', 'Dark themes', '#542f2a', '#fdf8f6', '#b66f55', '#cc6754', '#f0ddd7'),
    generatedTheme('petrol', 'Petrol Blue', 'Dark themes', '#173d4a', '#f6fbfc', '#378ba1', '#d17259', '#dceef1'),
    generatedTheme('espresso', 'Espresso', 'Dark themes', '#392b27', '#fcf8f4', '#987354', '#c66a55', '#eee0d7'),
    generatedTheme('royal', 'Royal Blue', 'Dark themes', '#27336c', '#f9f9ff', '#636ed4', '#d06d77', '#e5e7fa'),
    generatedTheme('garnet', 'Garnet', 'Dark themes', '#512431', '#fff8fa', '#ad526b', '#ce6862', '#f3dfe4'),
    generatedTheme('moss', 'Moss', 'Dark themes', '#34412d', '#fbfdf8', '#758f50', '#d07a55', '#e7edd9'),
    generatedTheme('eclipse', 'Eclipse', 'Dark themes', '#26243b', '#faf9ff', '#7470aa', '#cf7180', '#e8e6f4'),
    generatedTheme('steel', 'Steel Blue', 'Dark themes', '#2f4658', '#f8fbfd', '#5a91b5', '#cc745e', '#dfebf2')
  );
  const variableNames = ['--ink','--cream','--lime','--orange','--blue','--muted','--line','--glow','--header-bg','--dark-start','--dark-end','--accent-start','--accent-end','--accent-ink','--icon-hover','--field-line','--field-hover','--hero-start','--hero-end','--admin-start','--admin-end','--modal-line'];
  const darkOverrides = { '--cream': '#141923', '--ink': '#ecf0f4', '--muted': '#bac2cd', '--line': '#303a48', '--glow': '#1d2633', '--header-bg': '#181e29', '--icon-hover': '#252e3b', '--field-line': '#394452', '--field-hover': '#8aa3ff', '--hero-start': '#202a39', '--hero-end': '#151b26', '--modal-line': '#394452' };
  const apply = (id, persist = true) => {
    const selected = themes.some(theme => theme.id === id) ? id : 'navy';
    const config = themes.find(theme => theme.id === selected);
    variableNames.forEach(name => document.documentElement.style.removeProperty(name));
    document.documentElement.dataset.theme = selected;
    Object.entries(config?.palette || {}).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    if (document.documentElement.dataset.mode === 'dark') Object.entries(darkOverrides).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    if (persist) try { localStorage.setItem(storageKey, selected); } catch (_) { /* Theme still applies for this page. */ }
    window.dispatchEvent(new CustomEvent('shakalpa-theme-change', { detail: { theme: selected } }));
    return selected;
  };
  const applyMode = (mode, persist = true) => { const selected = ['light', 'dark'].includes(mode) ? mode : 'light'; document.documentElement.dataset.mode = selected; if (selected === 'dark') Object.entries(darkOverrides).forEach(([name, value]) => document.documentElement.style.setProperty(name, value)); else apply(document.documentElement.dataset.theme || 'navy', persist); if (persist) try { localStorage.setItem(modeKey, selected); } catch (_) { /* Mode still applies for this page. */ } return selected; };
  let current = 'navy'; try { current = localStorage.getItem(storageKey) || current; } catch (_) { /* Storage may be unavailable. */ }
  let currentMode = 'light'; try { currentMode = localStorage.getItem(modeKey) || currentMode; } catch (_) { /* Storage may be unavailable. */ }
  const isHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
  apply(current);
  applyMode(currentMode);
  window.ShakalpaThemes = { themes, apply, applyMode, get current() { return document.documentElement.dataset.theme || 'navy'; }, get mode() { return document.documentElement.dataset.mode || 'light'; } };

  if (isHome) { fetch('/api/site-theme', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null).then(data => { if (!data) return; apply(data.theme, false); applyMode(data.mode, false); }).catch(() => {}); return; }
  if (document.querySelector('#themePickerButton')) return;
  const admin = document.body.classList.contains('admin-page');
  const host = admin ? document.querySelector('.admin-actions') : document.querySelector('.header-actions');
  if (!host) return;
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'themePickerButton'; button.className = 'theme-icon-button'; button.title = 'Choose site theme'; button.setAttribute('aria-label', 'Choose site theme'); button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.1a1.9 1.9 0 0 0 1.8-2.5 1.9 1.9 0 0 1 1.8-2.5H18A3 3 0 0 0 21 13 10 10 0 0 0 12 3Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="10" cy="7.8" r="1"/><circle cx="14.8" cy="8.3" r="1"/></svg>';
  host.insertBefore(button, admin ? document.querySelector('#logoutButton') : null);
  const menu = document.createElement('div'); menu.className = 'theme-picker-menu'; menu.hidden = true;
  menu.innerHTML = '<p>Appearance</p><label class="theme-menu-label">Mode<select id="themeMode"><option value="light">Light mode</option><option value="dark">Dark mode</option></select></label><label class="theme-menu-label">Theme<select id="themeSelect"></select></label><small class="theme-picker-status" aria-live="polite"></small>';
  button.after(menu);
  const select = menu.querySelector('#themeSelect'), modeSelect = menu.querySelector('#themeMode'), status = menu.querySelector('.theme-picker-status');
  const render = () => { const selected = window.ShakalpaThemes.current; select.innerHTML = ['Light themes', 'Dark themes'].map(group => `<optgroup label="${group}">${themes.filter(theme => theme.group === group).map(theme => `<option value="${theme.id}" ${theme.id === selected ? 'selected' : ''}>${theme.name}</option>`).join('')}</optgroup>`).join(''); modeSelect.value = window.ShakalpaThemes.mode; const name = themes.find(theme => theme.id === selected)?.name || 'Midnight Sapphire'; status.textContent = `${name} · ${window.ShakalpaThemes.mode === 'dark' ? 'Dark' : 'Light'} mode.`; };
  const saveHomepageTheme = async () => { if (!admin) return; try { const response = await fetch('/api/admin/site-theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ theme: window.ShakalpaThemes.current, mode: window.ShakalpaThemes.mode }) }); const data = await response.json(); status.textContent = response.ok ? 'Homepage theme updated.' : (data.error || 'Could not update homepage theme.'); } catch (_) { status.textContent = 'Could not update homepage theme.'; } };
  render();
  button.addEventListener('click', () => { render(); menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); });
  select.addEventListener('change', async event => { apply(event.target.value); render(); await saveHomepageTheme(); });
  modeSelect.addEventListener('change', async event => { applyMode(event.target.value); render(); await saveHomepageTheme(); });
  document.addEventListener('click', event => { if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('shakalpa-theme-change', render);
})();
