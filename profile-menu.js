(() => {
  const esc = (v) => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  fetch('/api/session', {credentials:'same-origin'}).then(r => r.ok ? r.json() : Promise.reject()).then(({authenticated, account}) => {
    if (!authenticated || !account) return;
    document.querySelectorAll('.header-actions, .admin-actions').forEach((target) => {
      if (target.querySelector('.account-profile')) return;
      const name = [account.firstName, account.lastName].filter(Boolean).join(' ') || 'My profile';
      const defaultAvatar = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.8-3.5 3.1-5.3 6.5-5.3s5.7 1.8 6.5 5.3"/></svg>';
      const item = document.createElement('div'); item.className = 'account-profile'; item.dataset.preserveUserName = 'true';
      item.innerHTML = `<button type="button" class="account-profile-trigger" aria-expanded="false"><span class="account-profile-avatar">${account.profileImage ? `<img src="${esc(account.profileImage)}" alt=""/>` : defaultAvatar}</span><span class="account-profile-name">${esc(name)}</span></button><div class="account-profile-popover" hidden><strong>${esc(name)}</strong><small>${esc(account.role)}</small><label class="account-photo-upload">Change profile photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label><p class="account-profile-status" aria-live="polite"></p></div>`;
      target.prepend(item);
      const trigger = item.querySelector('.account-profile-trigger'), popover = item.querySelector('.account-profile-popover');
      trigger.addEventListener('click', () => { const show = popover.hidden; document.querySelectorAll('.account-profile-popover').forEach(p => p.hidden = true); popover.hidden = !show; trigger.setAttribute('aria-expanded', String(show)); });
      item.querySelector('input').addEventListener('change', async (event) => {
        const file = event.target.files?.[0], status = item.querySelector('.account-profile-status'); if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { status.textContent = 'Use JPEG, PNG, or WebP below 2 MB.'; return; }
        status.textContent = 'Uploading…';
        try { const response = await fetch('/api/account/profile-image', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image:await dataUrl(file)})}); const result = await response.json(); if (!response.ok) throw new Error(result.error); item.querySelector('.account-profile-avatar').innerHTML = `<img src="${esc(result.profileImage)}" alt=""/>`; status.textContent = 'Profile photo updated.'; } catch (error) { status.textContent = error.message || 'Upload failed.'; }
      });
    });
  }).catch(() => {});
})();
