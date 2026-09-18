(() => {
  const form = document.querySelector('#vendorProfileForm');
  const ownerImage = document.querySelector('#ownerImage');
  const addressHeading = form?.querySelector('.address-heading');
  if (!form || !ownerImage || !addressHeading) return;
  ownerImage.closest('label').remove();

  const styles = document.createElement('style');
  styles.textContent = '.vendor-identity-section{margin:18px 0 0;padding:16px;border:1px solid var(--line);display:grid;gap:13px}.vendor-identity-section legend{padding:0 5px;font-size:14px;font-weight:800}.vendor-identity-section>p,.vendor-identity-section>small{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.vendor-identity-section label{font-size:12px}.vendor-identity-section input[type=file]{padding:9px;font-size:11px;border:1px dashed #a7b7ac;background:#fbfdf9}.vendor-identity-section .identity-optional{display:grid;gap:13px;padding-top:13px;border-top:1px solid var(--line)}.vendor-identity-section .optional{font-size:10px;color:var(--muted);font-weight:500}.live-photo-row{display:flex;flex:0 0 100%;width:100%;align-items:center;gap:8px;margin-top:3px;border:1px dashed #a7b7ac;background:#fbfdf9;padding:5px}.vendor-identity-section .live-photo-row input[type=file]{min-width:0;flex:1;border:0;padding:4px;background:transparent}.live-photo-row button{flex:0 0 auto;border:1px solid var(--ink);background:#fff;padding:7px 10px;color:var(--ink);font:700 11px "DM Sans",sans-serif;cursor:pointer}.live-photo-status{display:block;flex:0 0 100%;width:100%;margin-top:5px;color:var(--muted);font-size:11px}.live-photo-camera,.captured-live-photo{display:grid;gap:8px;margin-top:9px}.live-photo-camera[hidden],.captured-live-photo[hidden]{display:none!important}.live-photo-camera video,.captured-live-photo img{width:min(260px,100%);max-height:190px;object-fit:cover;border:1px solid var(--line);background:#17211e}.live-photo-camera-actions,.captured-live-photo-actions{display:flex;gap:8px}.live-photo-camera-actions button,.captured-live-photo-actions button{border:0;background:var(--lime);padding:8px 11px;color:var(--ink);font:700 11px "DM Sans",sans-serif;cursor:pointer}.live-photo-camera-actions button:last-child,.captured-live-photo-actions button:last-child{background:transparent;border:1px solid var(--line)}';
  document.head.append(styles);

  const section = document.createElement('fieldset');
  section.className = 'vendor-identity-section';
  section.innerHTML = `<legend>Identity verification</legend><p>Required for Vendor approval. Submitted documents are stored securely and are not shown publicly.</p><label data-help="Upload a PDF, JPEG, PNG, or WebP file up to 1.5 MB.">Aadhaar document <span class="required-marker" aria-hidden="true">*</span><input id="vendorAadhaarDocument" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><label data-help="Upload a PDF, JPEG, PNG, or WebP file up to 1.5 MB.">PAN card document <span class="required-marker" aria-hidden="true">*</span><input id="vendorPanCardDocument" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><label data-help="Take a clear live image or upload a JPEG, PNG, or WebP image up to 1.5 MB.">Live photo <span class="required-marker" aria-hidden="true">*</span><input id="vendorLivePhoto" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required></label><div class="identity-optional"><label data-help="Enter the 10-character TAN if available.">TAN details<input id="vendorTanDetails" maxlength="10" placeholder="ABCD12345E"></label><label data-help="Upload a PDF, JPEG, PNG, or WebP file up to 1.5 MB if available.">MSME certificate<input id="vendorMsmeCertificate" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label></div>`;
  addressHeading.before(section);
  const livePhotoInput = document.querySelector('#vendorLivePhoto');
  const livePhotoRow = document.createElement('div');
  livePhotoRow.className = 'live-photo-row';
  livePhotoInput.before(livePhotoRow);
  livePhotoRow.append(livePhotoInput);
  livePhotoRow.insertAdjacentHTML('beforeend', '<button type="button" id="openLiveCamera">Take live photo</button>');
  livePhotoRow.insertAdjacentHTML('afterend', '<small class="live-photo-status" id="livePhotoStatus">or choose an image file</small><div class="live-photo-camera" id="livePhotoCamera" hidden><video id="liveCameraPreview" autoplay playsinline muted></video><div class="live-photo-camera-actions"><button type="button" id="captureLivePhoto" disabled>Capture photo</button><button type="button" id="cancelLiveCamera">Cancel</button></div></div>');
  let liveCameraStream = null;
  let capturedLivePhoto = null;
  const cameraPanel = document.querySelector('#livePhotoCamera');
  cameraPanel.insertAdjacentHTML('afterend', '<div class="captured-live-photo" id="capturedLivePhotoPanel" hidden><img id="capturedLivePhotoPreview" alt="Captured live photo"><div class="captured-live-photo-actions"><button type="button" id="retakeLivePhoto">Retake photo</button><button type="button" id="removeLivePhoto">Remove photo</button></div></div>');
  const cameraPreview = document.querySelector('#liveCameraPreview');
  const capturedPreview = document.querySelector('#capturedLivePhotoPreview');
  const capturedPanel = document.querySelector('#capturedLivePhotoPanel');
  const captureButton = document.querySelector('#captureLivePhoto');
  const stopCamera = () => { liveCameraStream?.getTracks().forEach((track) => track.stop()); liveCameraStream = null; cameraPreview.srcObject = null; };
  document.querySelector('#openLiveCamera').addEventListener('click', async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera capture is not supported in this browser. Choose an image file instead.');
      stopCamera();
      captureButton.disabled = true;
      liveCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 900 }, height: { ideal: 900 } }, audio: false });
      cameraPreview.srcObject = liveCameraStream;
      capturedPreview.hidden = true;
      capturedPanel.hidden = true;
      cameraPanel.hidden = false;
      document.querySelector('#livePhotoStatus').textContent = 'Starting camera…';
      cameraPreview.onloadedmetadata = async () => { await cameraPreview.play(); captureButton.disabled = false; document.querySelector('#livePhotoStatus').textContent = 'Camera is ready. Frame your face, then capture.'; };
    } catch (error) { document.querySelector('#livePhotoStatus').textContent = error.name === 'NotAllowedError' ? 'Camera permission was not allowed. You can enable it in your browser settings or choose an image file.' : error.message; }
  });
  captureButton.addEventListener('click', () => {
    if (captureButton.disabled || !cameraPreview.videoWidth) return;
    const size = Math.min(900, cameraPreview.videoWidth || 900, cameraPreview.videoHeight || 900);
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    canvas.getContext('2d').drawImage(cameraPreview, Math.max(0, (cameraPreview.videoWidth - size) / 2), Math.max(0, (cameraPreview.videoHeight - size) / 2), size, size, 0, 0, size, size);
    capturedLivePhoto = canvas.toDataURL('image/jpeg', 0.82);
    capturedPreview.src = capturedLivePhoto;
    capturedPreview.hidden = false;
    capturedPanel.hidden = false;
    livePhotoInput.required = false; livePhotoInput.value = '';
    stopCamera();
    cameraPanel.hidden = true;
    document.querySelector('#livePhotoStatus').textContent = 'Live photo captured. You can capture again or choose another image.';
    capturedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.querySelector('#cancelLiveCamera').addEventListener('click', () => { stopCamera(); cameraPanel.hidden = true; capturedPanel.hidden = !capturedLivePhoto; });
  document.querySelector('#retakeLivePhoto').addEventListener('click', () => document.querySelector('#openLiveCamera').click());
  document.querySelector('#removeLivePhoto').addEventListener('click', () => { capturedLivePhoto = null; capturedPanel.hidden = true; livePhotoInput.required = true; livePhotoInput.value = ''; document.querySelector('#livePhotoStatus').textContent = 'Live photo removed. Take a new photo or choose an image file.'; });
  livePhotoInput.addEventListener('change', () => { if (livePhotoInput.files[0]) { capturedLivePhoto = null; livePhotoInput.required = true; capturedPanel.hidden = true; document.querySelector('#livePhotoStatus').textContent = 'Image file selected.'; } });

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve({ name: file.name, content: reader.result }));
    reader.addEventListener('error', () => reject(new Error(`Could not read ${file.name}.`)));
    reader.readAsDataURL(file);
  });
  const identityPayload = async () => {
    const fields = { aadhaar: '#vendorAadhaarDocument', panCard: '#vendorPanCardDocument', livePhoto: '#vendorLivePhoto' };
    if (document.querySelector('#vendorMsmeCertificate').files[0]) fields.msmeCertificate = '#vendorMsmeCertificate';
    const documents = {};
    for (const [key, selector] of Object.entries(fields)) {
      const file = document.querySelector(selector).files[0];
      if (key === 'livePhoto' && capturedLivePhoto) { documents[key] = { name: 'live-photo.jpg', content: capturedLivePhoto }; continue; }
      if (!file) throw new Error('Upload the Aadhaar document, PAN card, and live photo.');
      if (file.size > 1_500_000) throw new Error(`${file.name} must be smaller than 1.5 MB.`);
      documents[key] = await readFile(file);
    }
    return documents;
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (resource, options = {}) => {
    if (typeof resource === 'string' && resource.endsWith('/api/vendor/profile') && options.method === 'POST' && typeof options.body === 'string') {
      const payload = JSON.parse(options.body);
      payload.identityDocuments = await identityPayload();
      payload.tanDetails = document.querySelector('#vendorTanDetails').value;
      options = { ...options, body: JSON.stringify(payload) };
    }
    return nativeFetch(resource, options);
  };
})();
