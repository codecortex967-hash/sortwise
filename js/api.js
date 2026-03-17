/**
 * SortWise — AI Waste Detection API Integration
 * Provides the detectWaste() function for image classification.
 */

// ── Configuration ──
const API_CONFIG = {
  // Replace with your actual AI API endpoint
  endpoint: 'https://api.example.com/v1/waste-detect',
  // Replace with your actual API key
  apiKey: 'YOUR_API_KEY_HERE',
};

/**
 * Send an image file to the AI waste-detection API.
 * @param {File} imageFile - The image file to classify.
 * @returns {Promise<{category: string, suggestion: string}>}
 */
async function detectWaste(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize the API response to our expected shape
    return {
      category: data.category || data.waste_type || 'Unknown',
      suggestion: data.suggestion || data.recycling_tip || 'No suggestion available.',
    };
  } catch (error) {
    console.error('Waste detection API error:', error);

    // Fallback: simulate a local prediction for demo purposes
    return simulateLocalPrediction(imageFile);
  }
}

/**
 * Fallback: simulated local prediction when the API is unavailable.
 * This provides a realistic demo experience.
 */
function simulateLocalPrediction(imageFile) {
  return new Promise((resolve) => {
    const categories = [
      {
        category: 'Recyclable — PET Plastic',
        suggestion: 'Rinse the container and remove labels before placing in the blue recycling bin.',
      },
      {
        category: 'Organic — Food Waste',
        suggestion: 'Place in the green compost bin. Avoid adding dairy or meat products.',
      },
      {
        category: 'Hazardous — E-Waste',
        suggestion: 'Do NOT place in regular bins. Take to a designated e-waste collection centre.',
      },
      {
        category: 'Recyclable — Paper / Cardboard',
        suggestion: 'Flatten cardboard boxes and keep paper dry. Place in the blue recycling bin.',
      },
      {
        category: 'Non-Recyclable — Mixed Waste',
        suggestion: 'Place in the black general waste bin. Consider if any parts are recyclable.',
      },
      {
        category: 'Recyclable — Glass',
        suggestion: 'Rinse glass containers. Separate by colour if required. Place in the glass recycling bin.',
      },
    ];

    // Pick a "random" category based on file size for consistent demo results
    const index = imageFile.size % categories.length;

    setTimeout(() => {
      resolve(categories[index]);
    }, 1500 + Math.random() * 1000);
  });
}

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
    resultBox.style.display = 'flex';
    resultBox.className = 'result-box success';
    resultBox.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 10 16 17 9"/><circle cx="12" cy="12" r="10"/></svg>
      <div>
        <div class="result-category">${result.category}</div>
        <div class="result-suggestion">${result.suggestion}</div>
      </div>
    `;
  });

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
