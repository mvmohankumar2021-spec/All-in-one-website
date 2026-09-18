const contactForm = document.querySelector('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.querySelector('#contactFormMessage');
    const submit = contactForm.querySelector('[type="submit"]');
    message.textContent = '';
    if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
    submit.disabled = true;
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name: document.querySelector('#contactName').value, contactNumber: document.querySelector('#contactNumber').value, email: document.querySelector('#contactEmail').value, contactFor: document.querySelector('#contactFor').value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your enquiry could not be sent.');
      contactForm.reset();
      message.classList.add('contact-success');
      message.textContent = data.message;
    } catch (error) {
      message.classList.remove('contact-success');
      message.textContent = error.message;
    } finally { submit.disabled = false; }
  });
}
