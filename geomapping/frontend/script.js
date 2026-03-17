// Elements
const mapLoader = document.getElementById('map-loader');
const submitBtns = document.querySelectorAll('.submit-btn');
const loadHeatmapBtn = document.getElementById('load-heatmap-btn');
const locationStatus = document.getElementById('location-status');
const filterTypeSelect = document.getElementById('filter-type');
const filterTimeSelect = document.getElementById('filter-time');
const filterCitySelect = document.getElementById('filter-city');
const statsContainer = document.getElementById('stats-container');
const insightsContainer = document.getElementById('insights-container');
const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
const generateDemoBtn = document.getElementById('generate-demo-btn');
const notificationArea = document.getElementById('notification-area');
const dbStatusDot = document.getElementById('db-status');
const dbStatusText = document.getElementById('db-status-text');

// ==========================================
// INTEGRATION POINT: API URL
// Uses value from config.js
// ==========================================
const API_URL = `${CONFIG.API_BASE_URL}/api/waste`;
const STATUS_URL = `${CONFIG.API_BASE_URL}/api/status`;

// ==========================================
// INTEGRATION POINT: Heatmap & Map Logic
// ==========================================
let map;
let heatLayer;
let markerLayer; // Layer for zone markers
let userLocation = null;

// City coordinates mapping
const cityCoords = {
    'Mumbai': [19.0760, 72.8777],
    'Indore': [22.7196, 75.8577]
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    fetchAnalytics(); // Fetch stats on load
    loadHeatmapData(); // Load heatmap data on load
    checkDatabaseStatus();
    // Poll status every 10 seconds
    setInterval(checkDatabaseStatus, 10000);
});

// Check Database Status
async function checkDatabaseStatus() {
    try {
        const response = await fetch(STATUS_URL);
        const data = await response.json();
        
        if (data.status === 'Connected') {
            dbStatusDot.classList.add('online');
            dbStatusText.innerText = 'Database: Connected';
            dbStatusText.style.color = 'var(--success)';
        } else {
            dbStatusDot.classList.remove('online');
            dbStatusText.innerText = 'Database: Disconnected';
            dbStatusText.style.color = 'var(--error)';
        }
    } catch (err) {
        dbStatusDot.classList.remove('online');
        dbStatusText.innerText = 'Database: Offline';
        dbStatusText.style.color = 'var(--error)';
    }
}

// Setup Map
function initMap() {
    map = L.map('map').setView(cityCoords['Mumbai'], 12); // Default to Mumbai

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    // Prompt for location early
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                // Only move if we aren't explicitly looking at a city
                // But for demo, centering on a city is often better
            },
            (err) => console.log('Geolocation initially denied/failed', err),
            { timeout: 10000 }
        );
    }
}

// Setup Event Listeners
function setupEventListeners() {
    submitBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wasteType = e.target.getAttribute('data-type');
            submitWasteReport(wasteType, e.target);
        });
    });

    filterCitySelect.addEventListener('change', () => {
        const city = filterCitySelect.value;
        const coords = cityCoords[city];
        if (coords) {
            map.flyTo(coords, 12, { duration: 1.5 });
        }
        loadHeatmapData();
        fetchAnalytics();
    });

    loadHeatmapBtn.addEventListener('click', loadHeatmapData);
    filterTypeSelect.addEventListener('change', () => {
        loadHeatmapData();
        fetchAnalytics();
    });
    filterTimeSelect.addEventListener('change', loadHeatmapData);
    refreshAnalyticsBtn.addEventListener('click', fetchAnalytics);
    generateDemoBtn.addEventListener('click', generateDemoData);
}

// Submit Waste Report Logic
async function submitWasteReport(wasteType, btnElement) {
    if (!navigator.geolocation) {
        showStatus('Geolocation not supported by browser', 'error');
        return;
    }

    const originalText = btnElement.innerText;
    btnElement.innerText = '⏳ Submitting...';
    btnElement.disabled = true;
    showStatus('Finding location...', '');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            userLocation = { lat, lng };
            map.flyTo([lat, lng], 14);

            await postData(wasteType, lat, lng);
            
            btnElement.innerText = originalText;
            btnElement.disabled = false;
        },
        (error) => {
            showStatus('Location access denied or failed.', 'error');
            btnElement.innerText = originalText;
            btnElement.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// POST data to API
async function postData(wasteType, lat, lng) {
    const payload = {
        waste_type: wasteType,
        latitude: lat,
        longitude: lng
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to submit');
        
        showNotification(`Successfully reported ${wasteType}!`, 'success');
        showStatus('', ''); // clear status

        if (heatLayer) loadHeatmapData();

    } catch (error) {
        console.error(error);
        showNotification('Submission error. Please try again.', 'error');
    }
}

// Manual Heatmap Loading
async function loadHeatmapData() {
    mapLoader.classList.remove('hidden');
    loadHeatmapBtn.innerText = '🔄 Refreshing...';
    loadHeatmapBtn.disabled = true;

    const selectedCity = filterCitySelect.value;
    const selectedType = filterTypeSelect.value;
    const selectedTime = filterTimeSelect.value;
    
    const params = new URLSearchParams();
    params.append('city', selectedCity);
    if (selectedType !== 'all') params.append('type', selectedType);
    if (selectedTime !== 'all') params.append('timeRange', selectedTime);

    const fetchUrl = `${API_URL}?${params.toString()}`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        
        renderHeatmap(data);
        
        let msg = `Loaded ${data.length} reports in ${selectedCity}`;
        showNotification(msg, 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to load heatmap.', 'error');
    } finally {
        mapLoader.classList.add('hidden');
        loadHeatmapBtn.innerText = '🔥 Load Heatmap';
        loadHeatmapBtn.disabled = false;
    }
}

// Render data using Leaflet Heat plugin
function renderHeatmap(data) {
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    const heatData = data.map(item => [item.latitude, item.longitude, 0.7]); 

    heatLayer = L.heatLayer(heatData, {
        radius: 35,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
            0.1: '#22c55e',
            0.4: '#eab308',
            0.7: '#f97316',
            1.0: '#ef4444'
        }
    }).addTo(map);
}

// Analytics Logic
async function fetchAnalytics() {
    refreshAnalyticsBtn.disabled = true;
    refreshAnalyticsBtn.innerText = '📊 Updating...';

    const selectedCity = filterCitySelect.value;
    const selectedType = filterTypeSelect.value;

    try {
        const response = await fetch(`${API_URL}/analytics?city=${selectedCity}&type=${selectedType}`);
        if (!response.ok) throw new Error('Analytics fetch failed');
        const data = await response.json();
        
        renderStats(data.stats);
        renderInsights(data.insights || []);
        renderMarkers(data.hotspots || []);
    } catch (error) {
        console.error(error);
        statsContainer.innerHTML = '<p class="subtitle error">Failed to load stats</p>';
    } finally {
        refreshAnalyticsBtn.disabled = false;
        refreshAnalyticsBtn.innerText = '📊 Refresh Analytics';
    }
}

function renderStats(stats) {
    statsContainer.innerHTML = '';
    const types = ['Plastic', 'Organic', 'Metal'];
    
    types.forEach(type => {
        const count = stats[type] || 0;
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <span class="count">${count}</span>
            <span class="label">${type}</span>
        `;
        statsContainer.appendChild(card);
    });
}

function renderInsights(insights) {
    insightsContainer.innerHTML = '';
    insights.forEach(text => {
        const item = document.createElement('div');
        item.className = 'insight-item';
        item.innerText = text;
        insightsContainer.appendChild(item);
    });
}

function renderMarkers(hotspots) {
    markerLayer.clearLayers();
    hotspots.forEach(spot => {
        const marker = L.marker([spot.lat, spot.lng], {
            icon: L.divIcon({
                className: 'zone-label',
                html: `
                    <div class="label-content">
                        <span class="area-name">HOTSPOT</span>
                        <span class="waste-tag ${spot.topType.toLowerCase()}">${spot.topType} Zone</span>
                        <span class="area-name">${spot.count} Reports</span>
                    </div>
                `,
                iconSize: [120, 60],
                iconAnchor: [60, 30]
            })
        });
        markerLayer.addLayer(marker);
    });
}

function showStatus(msg, type) {
    locationStatus.innerText = msg;
    locationStatus.className = `status-msg ${type}`;
}

function showNotification(msg, type) {
    notificationArea.innerText = msg;
    notificationArea.className = `notification-area ${type}`;
    setTimeout(() => {
        if (notificationArea.innerText === msg) {
            notificationArea.innerText = '';
            notificationArea.className = 'notification-area';
        }
    }, 5000);
}

async function generateDemoData() {
    try {
        const response = await fetch(`${API_URL}/seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: true })
        });
        const data = await response.json();
        showNotification(data.message, 'success');
        loadHeatmapData();
        fetchAnalytics();
    } catch (error) {
        showNotification('Failed to generate demo data', 'error');
    }
}
