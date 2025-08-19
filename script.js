document.addEventListener('DOMContentLoaded', ()=>{
  const startCamBtn = document.getElementById('startCamBtn');
  const stopCamBtn  = document.getElementById('stopCamBtn');
  const captureBtn  = document.getElementById('captureBtn');
  const fileInput   = document.getElementById('fileInput');
  const video       = document.getElementById('video');
  const canvas      = document.getElementById('canvas');
  const preview     = document.getElementById('preview');
  const hint        = document.getElementById('hint');
  const dropzone    = document.getElementById('dropzone');

  const statusEl = document.getElementById('status');
  const scoreWrap = document.getElementById('score');
  const scoreNum = document.getElementById('scoreNum');
  const scoreLabel = document.getElementById('scoreLabel');
  const ring = document.getElementById('ring');
  const kvWrap = document.getElementById('kv');
  const detType = document.getElementById('detType');
  const recycle = document.getElementById('recycle');
  const carbon = document.getElementById('carbon');
  const alts = document.getElementById('alts');

  let stream = null;
  function show(el){ el.classList.remove('hidden') }
  function hide(el){ el.classList.add('hidden') }
  function setStatus(msg){ statusEl.textContent = msg }

  async function startCamera(){
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio:false });
      video.srcObject = stream; await video.play();
      hide(preview); show(video); hide(hint);
      captureBtn.disabled = false; stopCamBtn.disabled = false;
      setStatus('Camera ready. Tap Capture to analyze.');
    }catch(err){ setStatus('Camera blocked or unavailable. You can upload a photo instead.'); }
  }
  function stopCamera(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } video.srcObject=null; hide(video); captureBtn.disabled=true; stopCamBtn.disabled=true; setStatus('Camera stopped.'); }

  function drawToCanvasFromVideo(){ if(!video.videoWidth) return null; canvas.width=video.videoWidth; canvas.height=video.videoHeight; canvas.getContext('2d').drawImage(video,0,0); return canvas; }
  function drawToCanvasFromImage(img){ canvas.width=img.naturalWidth; canvas.height=img.naturalHeight; canvas.getContext('2d').drawImage(img,0,0); return canvas; }

  function dataURLtoFile(dataUrl, filename){ const arr=dataUrl.split(','); const mime=arr[0].match(/:(.*?);/)[1]; const bstr=atob(arr[1]); let n=bstr.length; const u8=new Uint8Array(n); while(n--) u8[n]=bstr.charCodeAt(n); return new File([u8], filename, {type:mime}); }

  async function capture(){ const c=drawToCanvasFromVideo(); if(!c) return; const dataUrl=c.toDataURL('image/jpeg',.9); preview.src=dataUrl; show(preview); hide(video); hide(hint); setStatus('Analyzing captured frame…'); const file=dataURLtoFile(dataUrl,'capture.jpg'); await analyzeImage(file); }
  function loadImageFile(file){ return new Promise((res,rej)=>{ const reader=new FileReader(); reader.onload=e=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=e.target.result }; reader.readAsDataURL(file); }); }
  async function handleFiles(files){ const file=files[0]; if(!file) return; if(!file.type.startsWith('image/')){ setStatus('Please upload an image file.'); return; } setStatus('Loading image…'); try{ const img=await loadImageFile(file); drawToCanvasFromImage(img); preview.src=canvas.toDataURL('image/jpeg',.9); show(preview); hide(video); hide(hint); setStatus('Analyzing image…'); await analyzeImage(file);}catch{ setStatus('Could not load the image.'); }}

  async function analyzeImage(file){ await new Promise(r=>setTimeout(r,400)); const name=(file.name||'').toLowerCase(); const edibleHints=['apple','banana','bread','milk']; const nonEdibleHints=['bottle','plastic','phone']; let edible=edibleHints.some(k=>name.includes(k)); if(!edible) edible=!nonEdibleHints.some(k=>name.includes(k)); const ecoScore=Math.max(15,Math.min(95,Math.round((Math.random()*40+(edible?55:45))))); show(scoreWrap); show(kvWrap); alts.classList.remove('hidden'); scoreNum.textContent=ecoScore; scoreLabel.textContent=ecoScore>80? 'Excellent':ecoScore>60?'Good':ecoScore>40?'Fair':'Poor'; ring.style.setProperty('--deg', `${ecoScore/100*360}deg`); detType.textContent=edible?'Edible':'Non‑edible'; recycle.textContent=edible?'N/A':'Partially recyclable'; carbon.textContent='~1.5 kg CO₂e/kg'; alts.innerHTML='<li>Eco‑friendly alternative</li>'; setStatus('Analysis complete (demo).'); }

  startCamBtn.addEventListener('click', startCamera);
  stopCamBtn.addEventListener('click', stopCamera);
  captureBtn.addEventListener('click', capture);
  fileInput.addEventListener('change', e=>handleFiles(e.target.files));
  ;['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.add('dragover')}));
  ;['dragleave','drop'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.remove('dragover')}));
  dropzone.addEventListener('drop', e=>handleFiles(e.dataTransfer.files));
  window.addEventListener('beforeunload', stopCamera);
});
