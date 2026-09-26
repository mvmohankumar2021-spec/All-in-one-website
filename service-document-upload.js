(() => {
  document.querySelectorAll('.plumbing-onboarding input[type="file"]').forEach(input => {
    if (input.dataset.uploadReady) return;
    input.dataset.uploadReady = 'true';
    const status=document.createElement('small');status.className='service-upload-status';status.textContent='Choose files, then select Upload documents.';
    const button=document.createElement('button');button.type='button';button.className='service-upload-button';button.textContent='Upload documents';
    input.after(button,status);
    button.addEventListener('click',async()=>{const files=[...input.files];if(!files.length){status.textContent='Choose at least one PDF, JPEG, or PNG file first.';return}if(files.length>4||files.some(file=>!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>1.5*1024*1024)){status.textContent='Choose up to 4 PDF, JPEG, or PNG files, each up to 1.5 MB.';return}button.disabled=true;status.textContent='Uploading documents…';try{const documents=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,content:reader.result});reader.onerror=reject;reader.readAsDataURL(file)})));const response=await fetch('/api/vendor/service-documents',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({documents})});const data=await response.json();if(!response.ok)throw new Error(data.error);status.textContent=data.message||'Documents uploaded.';input.value=''}catch(error){status.textContent=error.message||'Upload failed. Please try again.'}finally{button.disabled=false}});
  });
})();
