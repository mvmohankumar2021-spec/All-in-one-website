const form = document.querySelector('#signupForm');
const error = document.querySelector('#signupError');
const toast = document.querySelector('#toast');
const roleSelector = document.querySelector('#signupRole');
const googleSignup = document.querySelector('#googleSignup');

function updateGoogleSignupLink() {
  googleSignup.href = `/api/auth/google?role=${encodeURIComponent(roleSelector.value)}`;
}
roleSelector.addEventListener('change', updateGoogleSignupLink);
updateGoogleSignupLink();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const fields = [...form.elements].filter((element) => element.tagName === 'INPUT');
  const invalid = fields.find((field) => !field.validity.valid);
  if (invalid) {
    error.textContent = 'Please check each field and enter valid account details.';
    invalid.focus();
    return;
  }
  const password = document.querySelector('#signupPassword');
  const confirmation = document.querySelector('#confirmPassword');
  if (password.value !== confirmation.value) {
    error.textContent = 'Passwords do not match. Please enter them again.';
    confirmation.focus();
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Creating account…';
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        firstName: document.querySelector('#firstName').value,
        lastName: document.querySelector('#lastName').value,
        phone: document.querySelector('#phone').value,
        email: document.querySelector('#signupEmail').value,
        role: document.querySelector('#signupRole').value,
        password: password.value,
        confirmPassword: confirmation.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not create your account.');
    form.reset();
    showToast('Account created. You can now sign in.');
    window.setTimeout(() => { window.location.href = 'index.html'; }, 1100);
  } catch (requestError) {
    error.textContent = requestError.message === 'Failed to fetch' ? 'Start the SHAKALPA server before creating an account.' : requestError.message;
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Create secure account <span>→</span>';
  }
});

if (new URLSearchParams(window.location.search).get('google') === 'phone_required') {
  showToast('Google verified your sign-in. Complete this form with your contact number to create the account.');
}
