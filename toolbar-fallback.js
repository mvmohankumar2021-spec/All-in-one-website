(() => {
  const restoreToolbar = () => {
    const bar = document.querySelector('.home-product-search');
    if (!bar || bar.querySelector('button')) return;
    bar.innerHTML = '<button class="compact-location" type="button" aria-label="Use current location"><span aria-hidden="true">⌖</span><b>Location</b><small>Select location</small></button><button class="home-search-symbol" type="button" aria-label="Open product search"><span aria-hidden="true"></span></button><label><input type="search" aria-label="Search products" placeholder="Search by name, category, type, or keyword"/></label>';
    const location = bar.querySelector('.compact-location');
    location.addEventListener('click', () => {
      const title = location.querySelector('b'), detail = location.querySelector('small');
      if (!navigator.geolocation) { detail.textContent = 'Location unavailable'; return; }
      title.textContent = 'Locating…'; detail.textContent = 'Allow location access';
      navigator.geolocation.getCurrentPosition(() => { title.textContent = 'Current location'; detail.textContent = 'Location selected'; }, () => { title.textContent = 'Location'; detail.textContent = 'Permission needed'; }, { enableHighAccuracy: false, timeout: 10000 });
    });
    bar.querySelector('.home-search-symbol').addEventListener('click', () => { bar.classList.add('is-open'); bar.querySelector('input').focus(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(restoreToolbar, 250));
  else setTimeout(restoreToolbar, 250);
})();
