// app.js - UI wiring, storage, and interactions

(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Mobile nav toggle
  const navToggle = $('.nav-toggle');
  const nav = $('.site-nav');
  if (navToggle && nav){
    navToggle.addEventListener('click', ()=>{
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Quick scan (home)
  const quickForm = $('#quickScanForm');
  const quickInput = $('#quickInput');
  const quickOut = $('#quickScanResult');

  if (quickForm){
    quickForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = (quickInput.value || '').trim();
      if (!text){ quickOut.innerHTML = '<div class="card">Please enter a product.</div>'; return; }
      const res = EcoAI.analyze({ text });
      quickOut.innerHTML = renderResult(res);
    });
  }

  // Scanner page
  const scanForm = $('#scanForm');
  const imageInput = $('#imageInput');
  const textInput = $('#textInput');
  const locationInput = $('#locationInput');
  const scanOutput = $('#scanOutput');
  const saveBtn = $('#saveResultBtn');

  let lastResult = null;

  if (scanForm){
    scanForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = (textInput.value || '').trim();
      const imageName = imageInput?.files?.[0]?.name || '';
      const location = (locationInput?.value || '').trim();

      if (!text && !imageName){
        scanOutput.innerHTML = '<div class="card">Add a photo or describe the product.</div>';
        return;
      }
      const res = EcoAI.analyze({ text, imageName, location });
      lastResult = res;
      scanOutput.innerHTML = renderResult(res, true);
      saveBtn.disabled = false;
    });

    saveBtn?.addEventListener('click', ()=>{
      if (!lastResult) return;
      const history = JSON.parse(localStorage.getItem('ecoreveal_history') || '[]');
      history.unshift(lastResult);
      localStorage.setItem('ecoreveal_history', JSON.stringify(history.slice(0,100)));
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      setTimeout(()=>{ saveBtn.textContent = 'Save to History'; }, 1500);
    });
  }

  // History page
  const historyList = $('#historyList');
  const exportBtn = $('#exportHistoryBtn');
  const clearBtn = $('#clearHistoryBtn');

  if (historyList){
    renderHistory();
    exportBtn?.addEventListener('click', ()=>{
      const data = localStorage.getItem('ecoreveal_history') || '[]';
      const blob = new Blob([data], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ecoreveal-history.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
    clearBtn?.addEventListener('click', ()=>{
      if (confirm('Clear all history on this device?')){
        localStorage.removeItem('ecoreveal_history');
        renderHistory();
      }
    });
  }

  function renderHistory(){
    const history = JSON.parse(localStorage.getItem('ecoreveal_history') || '[]');
    if (!history.length){
      historyList.innerHTML = '<div class="card">No scans yet.</div>';
      return;
    }
    historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="meta-row">
          <span class="kv"><strong>Date:</strong> ${new Date(item.timestamp).toLocaleString()}</span>
          <span class="kv"><strong>Edible:</strong> ${item.edible.isEdible ? 'Yes' : 'No'}</span>
          <span class="kv"><strong>Confidence:</strong> ${item.overallConfidence}</span>
        </div>
        <div>${renderResult(item)}</div>
      </div>
    `).join('');
  }

  // Alternatives page
  const altForm = $('#altForm');
  const altInput = $('#altInput');
  const altOutput = $('#altOutput');
  if (altForm){
    altForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = (altInput.value || '').trim();
      if (!text){ altOutput.innerHTML = '<div class="card">Enter a product category.</div>'; return; }
      const res = EcoAI.analyze({ text });
      altOutput.innerHTML = `
        ${renderResult(res)}
        <div class="card section">
          <h3>Why these alternatives?</h3>
          <p>${EcoAI.explain(res)}</p>
        </div>
      `;
    });
  }

  // Contact form
  const contactForm = $('#contactForm');
  const contactStatus = $('#contactStatus');
  if (contactForm){
    contactForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      contactStatus.textContent = 'Sending...';
      setTimeout(()=>{
        contactStatus.textContent = 'Thanks! We will get back to you shortly.';
        contactForm.reset();
      }, 600);
    });
  }

  // Render result helper
  function renderResult(res, detailed){
    const nut = res.nutrition ? `
      <div class="section">
        <h3>Nutrition (per ${res.nutrition.serving})</h3>
        <div class="meta-row">
          <span class="kv">Calories: ${res.nutrition.values.calories}</span>
          <span class="kv">Protein: ${res.nutrition.values.protein_g} g</span>
          <span class="kv">Fat: ${res.nutrition.values.fat_g} g</span>
          <span class="kv">Carbs: ${res.nutrition.values.carbs_g} g</span>
          <span class="kv">Fiber: ${res.nutrition.values.fiber_g} g</span>
          <span class="kv">Sodium: ${res.nutrition.values.sodium_mg} mg</span>
          <span class="kv">Calcium: ${res.nutrition.values.calcium_mg} mg</span>
          <span class="kv">Iron: ${res.nutrition.values.iron_mg} mg</span>
        </div>
        <p><em>${res.nutrition.assumptions}</em></p>
      </div>
    ` : '';

    const eco = `
      <div class="section">
        <h3>Eco Assessment</h3>
        <div class="meta-row">
          <span class="kv">Materials: ${res.eco.materials.join(', ')}</span>
          <span class="kv">Carbon tier: ${res.eco.carbonTier}</span>
          <span class="kv">Recyclable: ${res.eco.recyclable ? 'Likely' : 'Uncertain'}</span>
        </div>
        ${res.eco.guidance.length ? `<ul>${res.eco.guidance.map(g=>`<li>${g}</li>`).join('')}</ul>`:''}
      </div>
    `;

    const alt = `
      <div class="section">
        <h3>Greener Alternatives</h3>
        <ul>${res.alternatives.map(a=>`<li><strong>${a.item}:</strong> ${a.why}</li>`).join('')}</ul>
      </div>
    `;

    const tips = `
      <div class="section">
        <h3>Personalized Tips</h3>
        <ul>${res.tips.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
    `;

    const expl = detailed ? `
      <div class="section">
        <h3>Model Explanation</h3>
        <p>${EcoAI.explain(res)}</p>
      </div>
    ` : '';

    return `
      <div class="card">
        <div class="meta-row">
          <span class="kv"><strong>Edible:</strong> ${res.edible.isEdible ? 'Yes' : 'No'}</span>
          <span class="kv"><strong>Edible confidence:</strong> ${res.edible.confidence}</span>
          <span class="kv"><strong>Overall confidence:</strong> ${res.overallConfidence}</span>
        </div>
        ${nut}
        ${eco}
        ${alt}
        ${tips}
        ${expl}
      </div>
    `;
  }
})();
