/**
 * SortWise — AI Waste Detection API Integration
 * Provides the detectWaste() function for image classification.
 */

// ── Configuration ──
const API_CONFIG = {
  // Replace with your actual AI API endpoint
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  // Replace with your actual API key
  apiKey: 'AIzaSyAcZH1QQHUNdAAOeETgZ1FqnQPhUajZV0o',
};

const CATEGORY_MAP = {
  plastic: ['plastic', 'plastic bottle', 'wrapper', 'plastic bag', 'container', 'polyethylene'],
  metal: ['metal', 'tin can', 'aluminum can', 'metal lid', 'can', 'foil', 'steel', 'tin'],
  paper: ['paper', 'newspaper', 'cardboard', 'paper cup', 'carton', 'box', 'magazine'],
  glass: ['glass', 'glass bottle', 'jar'],
  organic: ['organic', 'banana peel', 'food waste', 'vegetables', 'leaves', 'food', 'peels', 'fruit', 'apple', 'scrap']
};

/**
 * Helper to convert File to base64 required by Gemini
 */
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapToFixedCategory(rawOutput) {
  const normalized = rawOutput.toLowerCase().trim();
  
  // Try direct match first
  if (Object.keys(CATEGORY_MAP).includes(normalized)) {
    return normalized;
  }

  // Fallback to keyword search
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }

  return 'Unknown'; 
}

/**
 * Send an image file to the AI waste-detection API.
 * @param {File} imageFile - The image file to classify.
 * @returns {Promise<{category: string, error?: boolean}>}
 */
async function detectWaste(imageFile) {
  try {
    const imagePart = await fileToGenerativePart(imageFile);

    const payload = {
      contents: [{
        parts: [
          { text: "Classify the waste item in the image into exactly one of these five categories: plastic, metal, paper, glass, organic. Return ONLY ONE WORD from this list and nothing else. No punctuation, no explanation." },
          imagePart
        ]
      }]
    };

    const response = await fetch(`${API_CONFIG.endpoint}?key=${API_CONFIG.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    let rawText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      rawText = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid response format from Gemini");
    }

    return { category: mapToFixedCategory(rawText) };
  } catch (error) {
    return { error: true };
  }
}

// Deprecated simulateLocalPrediction removed

// ── UI Helpers for the Upload Widget ──

/**
 * Initialize the AI waste identifier upload widget on UserDashboard.
 */
function initWasteIdentifier() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('waste-image-input');
  const previewArea = document.getElementById('preview-area');
  const previewImg = document.getElementById('preview-img');
  const removeBtn = document.getElementById('preview-remove');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultBox = document.getElementById('result-box');

  if (!uploadZone) return; // Not on UserDashboard

  let currentFile = null;

  // Click to upload
  uploadZone.addEventListener('click', () => fileInput.click());

  // File selected
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) showPreview(file);
  });

  // Drag & Drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.background = 'rgba(122, 149, 143, 0.08)';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.background = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) showPreview(file);
  });

  // Remove preview
  removeBtn.addEventListener('click', () => {
    resetUpload();
  });

  // Analyze button
  analyzeBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
    resultBox.style.display = 'none';

    const result = await detectWaste(currentFile);

    // Persist calculation to database if user is logged in
    const session = await window.auth.getSession();
    if (session.session) {
      const { error } = await window.auth.supabase
        .from('waste_logs')
        .insert({
          user_id: session.session.user.id,
          category: result.category,
          suggestion: result.suggestion,
          created_at: new Date().toISOString()
        });
      
      if (error) console.error('Error logging waste:', error);
    }

    analyzeBtn.style.display = 'none';
    resultBox.style.display = 'block';

    if (result.error) {
      resultBox.className = 'result-box error';
      resultBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem; color:#dc2626;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="result-category">Unable to classify waste item</div>
        </div>
      `;
      return;
    }

    const detectedCat = result.category === 'Unknown' ? 'organic' : result.category; // fallback if map fails entirely just in case

    // Render the 5 bins
    const bins = [
      { id: 'plastic', label: 'Plastic', color: '#3b82f6', bg: '#eff6ff' }, // Blue
      { id: 'metal', label: 'Metal', color: '#64748b', bg: '#f8fafc' },     // Gray
      { id: 'paper', label: 'Paper', color: '#eab308', bg: '#fefce8' },     // Yellow
      { id: 'glass', label: 'Glass', color: '#06b6d4', bg: '#ecfeff' },     // Cyan
      { id: 'organic', label: 'Organic', color: '#22c55e', bg: '#f0fdf4' }  // Green
    ];

    const binsHtml = bins.map(bin => {
      const isSelected = bin.id === detectedCat;
      const opacity = isSelected ? '1' : '0.4';
      const scale = isSelected ? 'transform: scale(1.1); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);' : 'transform: scale(0.95);';
      const border = isSelected ? `border: 2px solid ${bin.color};` : 'border: 2px solid transparent;';
      
      return `
        <div style="display:flex; flex-direction:column; align-items:center; opacity:${opacity}; transition:all 0.3s ease; ${scale}">
          <div style="width:48px; height:60px; border-radius:4px 4px 8px 8px; background:${bin.bg}; ${border} display:flex; justify-content:center; align-items:center; margin-bottom:8px; position:relative;">
            <!-- Bin Lid -->
            <div style="position:absolute; top:-6px; left:-4px; right:-4px; height:8px; background:${bin.color}; border-radius:4px 4px 0 0;"></div>
            <!-- Icon inside bin -->
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${bin.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${getBinIcon(bin.id)}
            </svg>
          </div>
          <span style="font-size:0.75rem; font-weight:600; color:${isSelected ? '#1f2937' : '#9ca3af'}; text-transform:capitalize;">${bin.label}</span>
        </div>
      `;
    }).join('');

    resultBox.className = 'result-box success';
    resultBox.style.flexDirection = 'column';
    resultBox.style.alignItems = 'center';
    resultBox.style.gap = '1.5rem';

    resultBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem; align-self:flex-start;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" style="color:#10b981;"><polyline points="20 6 9 17 4 12"/></svg>
        <div class="result-category" style="font-size:1.125rem;">Detected: <span style="text-transform:capitalize; color:#10b981;">${detectedCat}</span></div>
      </div>
      <div style="display:flex; justify-content:space-between; width:100%; margin-top:0.5rem;">
        ${binsHtml}
      </div>
    `;
  });

  function getBinIcon(id) {
    if (id === 'plastic') return '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'; // recycleish
    if (id === 'metal') return '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>';
    if (id === 'paper') return '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>';
    if (id === 'glass') return '<path d="M15.2 2H8.8a1 1 0 0 0-1 1v4.8a1 1 0 0 1-.3.7l-4.2 4.2A1 1 0 0 0 3 13.4V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6.6a1 1 0 0 0-.3-.7l-4.2-4.2a1 1 0 0 1-.3-.7V3a1 1 0 0 0-1-1z"/>';
    if (id === 'organic') return '<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.1 17 3.1s2.4 6 1.2 12.3A7 7 0 0 1 11 20z"/>';
    return '<circle cx="12" cy="12" r="10"/>';
  }

  function showPreview(file) {
    currentFile = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    uploadZone.style.display = 'none';
    previewArea.style.display = 'flex';
    analyzeBtn.style.display = 'inline-flex';
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = 'Identify Waste';
    resultBox.style.display = 'none';
  }

  function resetUpload() {
    currentFile = null;
    fileInput.value = '';
    previewImg.src = '';
    uploadZone.style.display = 'flex';
    previewArea.style.display = 'none';
    analyzeBtn.style.display = 'none';
    resultBox.style.display = 'none';
  }
}

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', initWasteIdentifier);
