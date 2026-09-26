(() => {
  const list = document.querySelector('#certificateList');
  if (!list) return;
  const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.className = 'document-removal-status'; list.after(notice);
  const style = document.createElement('style');
  style.textContent = '.document-list li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0}.document-list a{min-width:0;overflow-wrap:anywhere;flex:1}.document-remove{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:#942f27;font:26px/1 sans-serif;cursor:pointer}.document-remove:hover:not(:disabled){background:#fff0ed}.document-remove:focus-visible{outline:2px solid #942f27;outline-offset:2px}.document-remove:disabled{opacity:.55;cursor:not-allowed}.document-removal-status{font-size:13px;line-height:1.6;overflow-wrap:anywhere}'; document.head.append(style);
  list.classList.add('document-list');
  let current = null, busy = false;
  const lists = () => [list, ...document.querySelectorAll('[data-uploaded-document-list]')];
  function mountServiceLists() {
    let added = false;
    document.querySelectorAll('.plumbing-onboarding,.electrical-onboarding').forEach(panel => {
      if (panel.querySelector('[data-uploaded-document-list]')) return;
      const section = document.createElement('section');
      section.className = 'shared-uploaded-documents';
      const heading = document.createElement('h3'); heading.textContent = 'Supporting documents';
      const help = document.createElement('button'); help.type = 'button'; help.className = 'global-help-button'; help.textContent = 'ⓘ'; help.setAttribute('aria-label', 'Help for supporting documents'); help.setAttribute('aria-expanded', 'false');
      const explanation = document.createElement('span'); explanation.className = 'global-help-detail'; explanation.hidden = true; explanation.textContent = 'Upload relevant qualification, licence or work proof. PDF, JPEG or PNG; up to 4 files per upload, 1.5 MB each. These documents are shared across your service applications. Do not upload duplicates. Removing one removes it from the shared profile, not only this form.';
      heading.append(help, explanation);
      // All these lists show the shared certificate store, so use its existing
      // picker/upload handler rather than submitting another service form.
      const input = document.querySelector('#certificateDocuments');
      const source = input?.closest('label');
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'button button-outline shared-document-choose';
      const uploadStatus = document.createElement('p'); uploadStatus.className = 'shared-document-status'; uploadStatus.setAttribute('role', 'status');
      const syncUpload = () => {
        const handler = source?.querySelector('.service-upload-button:not([hidden])');
        choose.textContent = input?.files.length ? `Upload ${input.files.length} document${input.files.length === 1 ? '' : 's'}` : 'Choose documents';
        choose.disabled = !input || !handler || handler.disabled;
        uploadStatus.textContent = source?.querySelector('.service-upload-status')?.textContent || '';
      };
      choose.addEventListener('click', () => { source?.querySelector('.service-upload-button:not([hidden])')?.click(); syncUpload(); });
      input?.addEventListener('change', syncUpload);
      if (source) new MutationObserver(syncUpload).observe(source, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['disabled']});
      syncUpload();
      const view = document.createElement('a'); view.href = '#certificateList'; view.textContent = 'View uploaded profile documents';
      const documents = document.createElement('ul'); documents.dataset.uploadedDocumentList = '';
      section.append(heading, choose, uploadStatus, view, documents);
      const agreements = panel.querySelector('.plumbing-agreements,.electrical-agreements');
      if (agreements?.parentElement?.parentElement === panel) agreements.parentElement.before(section);
      else panel.append(section);
      added = true;
    });
    return added;
  }
  mountServiceLists();
  new MutationObserver(() => { if (mountServiceLists()) render(); }).observe(document.querySelector('#vendorProfileForm'), {childList:true,subtree:true});
  // This control only clears a captured, not-yet-uploaded photo. Preserve its
  // existing handler and do not route identity documents to certificate deletion.
  const removePhoto = document.querySelector('#removeLivePhoto');
  if (removePhoto) {
    removePhoto.textContent = '×'; removePhoto.classList.add('document-remove');
    removePhoto.setAttribute('aria-label', 'Remove selected live photo'); removePhoto.title = 'Remove selected live photo';
  }
  function decorate() {
    lists().forEach(host => {
      host.classList.add('document-list');
      host.querySelectorAll('a[href*="/api/vendor/certificate?id="]').forEach(link => {
        if (link.parentElement.querySelector('.document-remove')) return;
        const id = Number(new URL(link.href).searchParams.get('id'));
        const button = document.createElement('button'); button.type = 'button'; button.className = 'document-remove'; button.textContent = '×'; button.setAttribute('aria-label', `Remove ${link.textContent}`);
        button.disabled = !current || current.locked || busy;
        button.title = current?.locked ? 'Under review or approved: contact support for replacement.' : 'Remove this uploaded document';
        button.addEventListener('click', async () => {
          if (busy || !window.confirm(`Remove "${link.textContent}" from your application? It will no longer count as an uploaded document. An archived copy is retained for recovery and audit.`)) return;
          busy = true; lists().forEach(el=>el.querySelectorAll('.document-remove').forEach(b=>b.disabled=true));
          notice.textContent = 'Removing document…';
          try {
            const response = await fetch('/api/vendor/remove-document', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})}); const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not remove document.');
            notice.textContent = data.message; await refresh();
          } catch (error) { notice.textContent = error.message; }
          finally { busy = false; lists().forEach(el=>el.querySelectorAll('.document-remove').forEach(b=>b.disabled=!current || current.locked)); }
        }); link.after(button);
      });
    });
  }
  function render() {
    if (!current) return;
    lists().forEach(host => {
      host.replaceChildren();
      if (!current.documents.length) { const empty = document.createElement('li'); empty.textContent = 'No documents uploaded yet.'; host.append(empty); }
      current.documents.forEach(doc => { const li=document.createElement('li'), a=document.createElement('a'); a.href=`/api/vendor/certificate?id=${encodeURIComponent(doc.id)}`; a.target='_blank'; a.rel='noopener'; a.textContent=doc.name; li.append(a); host.append(li); });
    });
    const count = document.querySelector('#previewCertificateCount'); if (count) count.textContent = `${current.documents.length} uploaded`;
    decorate();
  }
  async function refresh() {
    const response = await fetch('/api/vendor/documents'); if (!response.ok) throw new Error('Could not refresh uploaded documents. Reload to check the latest list.');
    current = await response.json(); render();
    if (current.locked) notice.textContent = 'Documents are locked because an application is under review or approved. Contact support for replacement.';
  }
  new MutationObserver(decorate).observe(list, {childList:true,subtree:true});
  document.addEventListener('uploaded-document-list-ready', () => { if (current) render(); });
  // Observe only successful existing document/profile writes; never change the
  // payload, upload validation, credentials or approval handler.
  const previousFetch = window.fetch.bind(window);
  const endpoints = new Set(['/api/vendor/retail-onboarding','/api/vendor/household-onboarding','/api/vendor/fresh-food-onboarding','/api/vendor/grocery-onboarding','/api/vendor/service-documents','/api/vendor/plumbing-certificates','/api/vendor/furniture-certificates','/api/vendor/electrical-certificates','/api/vendor/profile','/api/vendor/catering-onboarding','/api/vendor/meal-onboarding','/api/vendor/plumbing-onboarding','/api/vendor/furniture-onboarding','/api/vendor/electrical-onboarding']);
  window.fetch = async (resource, options = {}) => {
    const response = await previousFetch(resource, options);
    if (typeof resource === 'string' && endpoints.has(resource) && options.method?.toUpperCase() === 'POST' && response.ok) refresh().catch(error=>notice.textContent=error.message);
    return response;
  };
  refresh().catch(error=>notice.textContent=error.message);
})();

