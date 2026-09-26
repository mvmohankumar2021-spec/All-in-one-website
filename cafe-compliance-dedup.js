(() => {
  const cafeServices=new Set(['Cafe','Tea Shop','Juice Shop','Ice Cream Shop','Snack Shop','Street Food']);
  const type=document.querySelector('#certificateType'), details=document.querySelector('#certificateDetails'), documents=document.querySelector('#certificateDocuments');
  const heading=[...document.querySelectorAll('.address-heading')].find(item=>item.textContent.includes('CERTIFICATE'));
  const sync=()=>{const active=[...document.querySelectorAll('#vendorServicesProducts option:checked')].some(option=>cafeServices.has(option.value));if(!type)return;const fssai=type.querySelector('option[value="fssai"]');if(fssai)fssai.hidden=active;if(active&&type.value==='fssai'){type.value='';details?.closest('label')?.setAttribute('hidden','');}if(heading)heading.textContent=active?'ADDITIONAL BUSINESS COMPLIANCE':'CERTIFICATE & COMPLIANCE';const label=documents?.closest('label');if(label&&active){const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);if(text)text.textContent='Supporting business compliance documents (only if not already supplied in Café onboarding)';}};
  document.querySelector('#vendorServicesProducts')?.addEventListener('change',sync);sync();
})();
