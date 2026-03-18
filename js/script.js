/**
 * SortWise — Shared JavaScript
 * Handles: navbar toggle, admin dashboard charts/tables, user dashboard charts.
 */

// ============================================
// NAVBAR — Mobile Toggle
// ============================================
function initNavbar() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (!toggleBtn || !mobileNav) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    // Swap hamburger ↔ close icon
    toggleBtn.innerHTML = isOpen
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });

  // Highlight active page in nav
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split('/').pop() || 'index.html';
  
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Direct match or Home redirection
    const isHome = (currentPage === 'index.html' || currentPage === 'Home.html') && href === 'Home.html';
    const isExact = href === currentPage;
    
    // Check if the link target is contained in the current path (for subdirectories)
    const isSubPath = href !== 'Home.html' && currentPath.includes(href);

    // Dashboard mappings
    const isUserPortal = currentPage === 'UserDashboard.html' && href === 'UserLogin.html';
    const isAdminPortal = currentPage === 'AdminDashboard.html' && href === 'AdminLogin.html';

    if (isHome || isExact || isSubPath || isUserPortal || isAdminPortal) {
      link.classList.add('active');
    }
  });
}

// ============================================
// BAR CHART — Pure Canvas Rendering
// ============================================

/**
 * Draw a grouped / stacked horizontal or vertical bar chart on a <canvas>.
 * @param {string} canvasId
 * @param {Object} config
 */
function drawBarChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Responsive sizing
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const {
    data,
    labels,
    datasets,
    orientation = 'vertical', // 'vertical' or 'horizontal'
    stacked = true,
    maxVal: explicitMax,
  } = config;

  const padding = { top: 30, right: 30, bottom: 60, left: orientation === 'horizontal' ? 90 : 50 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Calculate max value
  let maxVal = 0;
  data.forEach((item) => {
    let sum = 0;
    datasets.forEach((ds) => { sum += item[ds.key] || 0; });
    if (sum > maxVal) maxVal = sum;
  });
  
  if (explicitMax && maxVal < explicitMax) {
    maxVal = explicitMax;
  } else {
    maxVal = Math.ceil(maxVal / 10) * 10 || 10;
    // ensure maxVal is at least 10 for better visuals when numbers are low
  }

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const gridCount = 4;

  if (orientation === 'vertical') {
    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + chartH - (chartH / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((maxVal / gridCount) * i), padding.left - 8, y + 4);
    }
  } else {
    for (let i = 0; i <= gridCount; i++) {
      const x = padding.left + (chartW / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, H - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round((maxVal / gridCount) * i), x, H - padding.bottom + 18);
    }
  }
  ctx.setLineDash([]);

  // Draw bars
  const barCount = data.length;

  if (orientation === 'vertical') {
    const barGroupWidth = chartW / barCount;
    const barWidth = Math.min(barGroupWidth * 0.45, 36);

    data.forEach((item, i) => {
      const x = padding.left + barGroupWidth * i + (barGroupWidth - barWidth) / 2;
      let yOffset = 0;

      datasets.forEach((ds) => {
        const val = item[ds.key] || 0;
        const barH = (val / maxVal) * chartH;
        const y = padding.top + chartH - yOffset - barH;

        ctx.fillStyle = ds.color;
        roundRect(ctx, x, y, barWidth, barH, 4);

        yOffset += barH;
      });

      // X-axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, H - padding.bottom + 20);
    });
  } else {
    const barGroupHeight = chartH / barCount;
    const barHeight = Math.min(barGroupHeight * 0.45, 24);

    data.forEach((item, i) => {
      const y = padding.top + barGroupHeight * i + (barGroupHeight - barHeight) / 2;
      let xOffset = 0;

      datasets.forEach((ds) => {
        const val = item[ds.key] || 0;
        const barW = (val / maxVal) * chartW;

        ctx.fillStyle = ds.color;
        roundRect(ctx, padding.left + xOffset, y, barW, barHeight, 4);

        xOffset += barW;
      });

      // Y-axis label
      ctx.fillStyle = '#292421';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(labels[i], padding.left - 8, y + barHeight / 2 + 4);
    });
  }

  // Legend
  const legendY = H - 15;
  let legendX = padding.left;
  ctx.font = '12px Inter, sans-serif';
  datasets.forEach((ds) => {
    ctx.fillStyle = ds.color;
    ctx.fillRect(legendX, legendY - 8, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(ds.label, legendX + 16, legendY + 2);
    legendX += ctx.measureText(ds.label).width + 36;
  });
}

/** Helper: draw a rounded rectangle */
function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ============================================
// ADMIN DASHBOARD — Household Table & Fines
// ============================================

let dbUsersCache = [];

async function initAdminDashboard() {
  const searchInput = document.getElementById('household-search');
  const tableBody = document.getElementById('household-tbody');

  if (!searchInput || !tableBody) return;

  // Render loading state
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="5">Loading system users...</td></tr>';

  // Wait for auth library initialization
  let retries = 0;
  while (!window.auth?.supabase?.value && retries < 10) {
    await new Promise(r => setTimeout(r, 200));
    retries++;
  }

  if (window.auth?.supabase?.value && dbUsersCache.length === 0) {
    try {
      const { data, error } = await window.auth.supabase.value
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbUsersCache = data.map(u => ({
          id: u.id,
          name: u.full_name || 'Anonymous User',
          email: u.email,
          city: u.city || 'Unknown',
          role: u.role,
          created: new Date(u.created_at).toLocaleDateString(),
          // Mock data for UI visual completion since full reporting backend isn't mapped
          accuracy: Math.floor(Math.random() * (99 - 50 + 1) + 50),
          finesCount: Math.floor(Math.random() * 3),
          recentlyFined: false
        }));
      }
    } catch (e) {
      console.error('Error fetching admin user list:', e);
    }
  }

  function renderTable(filter = '') {
    const tableData = dbUsersCache.length > 0 ? dbUsersCache : [];
    
    const filtered = tableData.filter(
      (u) =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase()) ||
        u.id.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      tableBody.innerHTML =
        '<tr class="empty-row"><td colspan="5">No users found matching your search.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered
      .map((user) => {
        const accClass = user.accuracy >= 90 ? 'green' : user.accuracy >= 75 ? 'yellow' : 'red';
        const roleBadge = user.role === 'admin' 
          ? `<span style="background:#fef3c7; color:#d97706; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight: bold; margin-left: 8px;">ADMIN</span>`
          : `<span style="background:#e0f2fe; color:#0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight: bold; margin-left: 8px;">USER</span>`;
          
        const btnDisabled = user.recentlyFined || user.accuracy >= 90 || user.role === 'admin';
        const btnClass = user.recentlyFined ? 'btn btn-sm btn-fined' : 'btn btn-sm btn-fine-action';
        const btnContent = user.recentlyFined
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Fined'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Charge Fine';

        const finesBadge = user.finesCount > 0
            ? `<div class="fine-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ${user.finesCount} previous fine(s)</div>`
            : '<span class="text-xs text-gray">None</span>';

        return `
          <tr>
            <td>
              <div class="user-name" style="display:flex; align-items:center;">${user.name} ${roleBadge}</div>
              <div class="user-id" style="font-size: 0.75em;">ID: ${user.id.substring(0,8)}...</div>
            </td>
            <td>
              <div class="text-sm">${user.email}</div>
              <div class="text-xs text-gray font-medium">Joined: ${user.created}</div>
            </td>
            <td>
              <div class="text-sm">${user.city}</div>
            </td>
            <td>
              ${finesBadge}
            </td>
            <td>
              <div class="accuracy-bar-container">
                <div class="accuracy-bar"><div class="accuracy-bar-fill ${accClass}" style="width:${user.accuracy}%"></div></div>
                <span class="text-sm font-medium">${user.accuracy}%</span>
              </div>
            </td>
            <td style="text-align:center;">
              <button class="${btnClass}" data-user-id="${user.id}" ${btnDisabled ? 'disabled' : ''}>${btnContent}</button>
            </td>
          </tr>`;
      })
      .join('');

    // Attach fine button handlers
    tableBody.querySelectorAll('[data-user-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        const user = dbUsersCache.find((u) => u.id === userId);
        if (user && !user.recentlyFined) {
          user.recentlyFined = true;
          user.finesCount++;
          renderTable(searchInput.value);
        }
      });
    });
  }

  searchInput.addEventListener('input', () => renderTable(searchInput.value));

  // Initial render with actual data
  renderTable();

  // Draw admin chart
  drawBarChart('admin-chart', {
    data: [
      { correct: 400, incorrect: 45 },
      { correct: 300, incorrect: 80 },
      { correct: 500, incorrect: 30 },
      { correct: 278, incorrect: 65 },
      { correct: 480, incorrect: 120 },
    ],
    labels: ['North Dist.', 'South Dist.', 'East Dist.', 'West Dist.', 'Central'],
    datasets: [
      { key: 'correct', label: 'Correct (kg)', color: '#BAE0DA' },
      { key: 'incorrect', label: 'Incorrect (kg)', color: '#E1AD01' },
    ],
    orientation: 'horizontal',
    stacked: true,
  });
}

// ============================================
// USER DASHBOARD — Weekly Chart
// ============================================

function initUserDashboard() {
  drawBarChart('user-chart', {
    data: [
      { correct: 2.1, incorrect: 0.2 },
      { correct: 1.8, incorrect: 0.0 },
      { correct: 2.4, incorrect: 0.5 },
      { correct: 1.5, incorrect: 0.1 },
      { correct: 3.0, incorrect: 0.3 },
      { correct: 3.5, incorrect: 0.0 },
      { correct: 2.8, incorrect: 0.1 },
    ],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      { key: 'correct', label: 'Correctly Sorted (kg)', color: '#7A958F' },
      { key: 'incorrect', label: 'Incorrectly Sorted (kg)', color: '#292421' },
    ],
    orientation: 'vertical',
    stacked: true,
    maxVal: 40,
  });
}

// ============================================
// AI CAMERA FEATURE (User Dashboard)
// ============================================

function initCameraFeature() {
  const cameraBtn = document.getElementById('camera-btn');
  const galleryBtn = document.getElementById('gallery-btn');
  const cameraInput = document.getElementById('waste-camera-input');
  const galleryInput = document.getElementById('waste-gallery-input');
  const uploadZone = document.getElementById('upload-zone');
  const previewArea = document.getElementById('preview-area');
  const previewImg = document.getElementById('preview-img');
  const retakeBtn = document.getElementById('preview-retake');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultBox = document.getElementById('result-box');

  if (!cameraBtn || !cameraInput) return;

  // Trigger file inputs
  cameraBtn.addEventListener('click', () => cameraInput.click());
  galleryBtn.addEventListener('click', () => galleryInput.click());

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadZone.style.display = 'none';
        previewArea.style.display = 'flex';
        resultBox.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };

  cameraInput.addEventListener('change', handleFileSelect);
  galleryInput.addEventListener('change', handleFileSelect);

  // Retake / Clear
  retakeBtn.addEventListener('click', () => {
    cameraInput.value = '';
    galleryInput.value = '';
    previewImg.src = '';
    previewArea.style.display = 'none';
    uploadZone.style.display = 'flex';
    resultBox.style.display = 'none';
  });

  // Analyze (Mock success state for UI completeness)
  analyzeBtn.addEventListener('click', () => {
    const originalText = analyzeBtn.innerText;
    analyzeBtn.innerText = 'Analyzing...';
    analyzeBtn.disabled = true;

    // Simulate API call delay
    setTimeout(() => {
      analyzeBtn.innerText = originalText;
      analyzeBtn.disabled = false;
      
      // Show mock result
      resultBox.className = 'result-box success';
      resultBox.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div>
          <div class="result-category">Analyzed: Recyclable Plastic</div>
          <div class="result-suggestion">Please rinse before placing in the Blue Bin. Added 0.2kg to your weekly score!</div>
        </div>
      `;
      resultBox.style.display = 'flex';
    }, 1500);
  });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAdminDashboard();
  initUserDashboard();
  initCameraFeature();
});

// Redraw charts on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initAdminDashboard();
    initUserDashboard();
  }, 250);
});
