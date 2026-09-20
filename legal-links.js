(() => {
  const serviceMode = document.querySelector('#typeMode option[value="service"]');
  if (serviceMode) serviceMode.textContent = 'Service';
  if (location.pathname.endsWith('/policy-centre.html')) return;
  const link = document.createElement('a');
  link.href = 'policy-centre.html'; link.className = 'policy-centre-link'; link.textContent = 'Policies';
  const vendorNavigation = document.querySelector('.admin-nav');
  if (vendorNavigation) { vendorNavigation.append(link); return; }
  const footer = document.querySelector('footer');
  if (footer) { footer.append(link); return; }
  link.classList.add('floating-policy-link'); document.body.append(link);
})();
