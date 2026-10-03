(() => {
  const serviceMode = document.querySelector('#typeMode option[value="service"]');
  if (serviceMode) serviceMode.textContent = 'Service';
  const link = document.createElement('a');
  link.href = 'policy-centre.html'; link.className = 'policy-centre-link'; link.textContent = 'Policies';
  let footer = document.querySelector('footer');
  if (!footer) { footer=document.createElement('footer');footer.className='shared-utility-footer';document.body.append(footer); }
  footer.classList.add('feedback-site-footer');
  if (!location.pathname.endsWith('/policy-centre.html') && !footer.querySelector('.policy-centre-link')) footer.append(link);
  const style=document.createElement('link');style.rel='stylesheet';style.href='feedback.css';document.head.append(style);
  const script=document.createElement('script');script.src='feedback.js';document.body.append(script);
})();
