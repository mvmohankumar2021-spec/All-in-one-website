const form = document.querySelector('#signupForm');
const error = document.querySelector('#signupError');
const toast = document.querySelector('#toast');
const roleSelector = document.querySelector('#signupRole');
const googleSignup = document.querySelector('#googleSignup');
const identityDocuments = document.querySelector('#identityDocuments');
const vendorOnlyDocuments = document.querySelector('#vendorOnlyDocuments');
const identityFileInputs = [...identityDocuments.querySelectorAll('input[type="file"]')];

function updateGoogleSignupLink() {
  googleSignup.href = `/api/auth/google?role=${encodeURIComponent(roleSelector.value)}`;
  const needsIdentityVerification = roleSelector.value === 'Agent';
  identityDocuments.hidden = !needsIdentityVerification;
  vendorOnlyDocuments.hidden = roleSelector.value !== 'Vendor';
  identityFileInputs.forEach((input) => { input.disabled = !needsIdentityVerification; });
  document.querySelector('#aadhaarDocument').required = needsIdentityVerification;
  document.querySelector('#panCardDocument').required = needsIdentityVerification;
  document.querySelector('#livePhoto').required = needsIdentityVerification;
  document.querySelector('#tanDetails').disabled = roleSelector.value !== 'Vendor';
  document.querySelector('#msmeCertificate').disabled = roleSelector.value !== 'Vendor';
  googleSignup.closest('.google-login').hidden = needsIdentityVerification;
  document.querySelector('.google-signup-note').hidden = needsIdentityVerification;
}
roleSelector.addEventListener('change', updateGoogleSignupLink);
updateGoogleSignupLink();

function readDocument(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve({ name: file.name, content: reader.result }));
    reader.addEventListener('error', () => reject(new Error(`Could not read ${file.name}.`)));
    reader.readAsDataURL(file);
  });
}

async function identityPayload(role) {
  if (role !== 'Agent') return {};
  const fieldMap = { aadhaar: '#aadhaarDocument', panCard: '#panCardDocument', livePhoto: '#livePhoto' };
  if (role === 'Vendor' && document.querySelector('#msmeCertificate').files[0]) fieldMap.msmeCertificate = '#msmeCertificate';
  const documents = {};
  for (const [key, selector] of Object.entries(fieldMap)) {
    const file = document.querySelector(selector).files[0];
    if (!file) throw new Error('Upload the required Aadhaar document, PAN card, and live photo.');
    if (file.size > 1_500_000) throw new Error(`${file.name} must be smaller than 1.5 MB.`);
    documents[key] = await readDocument(file);
  }
  return documents;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const fields = [...form.elements].filter((element) => element.tagName === 'INPUT' || element.tagName === 'SELECT');
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
        donorStatus: new FormData(form).get('donorStatus'),
        identityDocuments: await identityPayload(roleSelector.value),
        tanDetails: document.querySelector('#tanDetails').disabled ? '' : document.querySelector('#tanDetails').value,
        password: password.value,
        confirmPassword: confirmation.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not create your account.');
    form.reset();
    updateGoogleSignupLink();
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
