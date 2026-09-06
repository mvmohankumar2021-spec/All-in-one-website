const form = document.querySelector('#adminSetupForm');
const error = document.querySelector('#formError');
const toast = document.querySelector('#toast');
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 3200); };

form.addEventListener('submit', async (event) => {
  event.preventDefault(); error.textContent = '';
  const fields = [...form.querySelectorAll('input')]; const invalid = fields.find((field) => !field.validity.valid);
  if (invalid) { error.textContent = 'Please complete every field with valid details.'; invalid.focus(); return; }
  if (document.querySelector('#password').value !== document.querySelector('#confirmPassword').value) { error.textContent = 'Passwords do not match.'; document.querySelector('#confirmPassword').focus(); return; }
  const submit = form.querySelector('[type="submit"]'); submit.disabled = true; submit.textContent = 'Creating Admin…';
  try {
    const response = await fetch('/api/setup-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ firstName: document.querySelector('#firstName').value, lastName: document.querySelector('#lastName').value, phone: document.querySelector('#phone').value, email: document.querySelector('#email').value, password: document.querySelector('#password').value, confirmPassword: document.querySelector('#confirmPassword').value, setupKey: document.querySelector('#setupKey').value }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not create the Admin account.');
    form.reset(); showToast('Admin account created. Redirecting to sign in…'); window.setTimeout(() => { window.location.href = 'index.html'; }, 1100);
  } catch (requestError) { error.textContent = requestError.message === 'Failed to fetch' ? 'Start the SHAKALPA server before using this page.' : requestError.message; }
  finally { submit.disabled = false; submit.innerHTML = 'Create Admin account <span>→</span>'; }
});
