(() => {
  const services=new Set(['Cafe','Tea Shop','Juice Shop','Ice Cream Shop','Snack Shop','Street Food']);
  const sync=()=>{const active=new Set([...document.querySelectorAll('#vendorServicesProducts option:checked')].map(option=>option.value));document.querySelectorAll('.cafe-onboarding .plumbing-row').forEach(row=>{const show=active.has(row.dataset.service);row.hidden=!show;row.style.display=show?'grid':'none'});};
  ['vendorServicesProducts','vendorMainCategory','vendorSubcategories'].forEach(id=>document.querySelector(`#${id}`)?.addEventListener('change',sync));sync();
})();
