/**
 * SortWise — Heatmap Visualization Module
 * Handles Leaflet heatmap rendering using Supabase data.
 */

(function() {
    let map;
    let heatLayer;
    
    // City coordinates
    const cityCoords = {
        'Mumbai': [19.0760, 72.8777],
        'Indore': [22.7196, 75.8577]
    };

    async function initHeatmap() {
        console.log('--- STARTING HEATMAP INIT ---');
        const mapContainer = document.getElementById('waste-heatmap');
        if (!mapContainer) {
            console.error('Heatmap Container ID "waste-heatmap" NOT FOUND in DOM.');
            return;
        }

        // Check for Leaflet
        if (typeof L === 'undefined') {
            const err = 'Leaflet script (L) is not loaded. Check your CDN script tags in the footer.';
            console.error(err);
            mapContainer.innerHTML = `<p style="padding: 2rem; color: #dc2626; text-align: center;">${err}</p>`;
            return;
        }

        // Initialize Map
        try {
            console.log('Initializing Leaflet map instance...');
            map = L.map('waste-heatmap').setView(cityCoords['Mumbai'], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Force a resize in case the container was hidden or flex-collapsed initially
            setTimeout(() => map.invalidateSize(), 500);

        } catch (initErr) {
            console.error('CRITICAL: Leaflet Map Instance Error:', initErr);
            mapContainer.innerHTML = `<p style="padding: 2rem; color: #dc2626; text-align: center;">Map Initialization Error: ${initErr.message}</p>`;
            return;
        }

        // Setup Filters
        const citySelector = document.getElementById('map-filter-city');
        const typeSelector = document.getElementById('map-filter-type');

        if (citySelector) {
            citySelector.addEventListener('change', () => {
                const coords = cityCoords[citySelector.value];
                if (coords) map.flyTo(coords, 12);
                loadHeatmapData();
            });
        }

        if (typeSelector) {
            typeSelector.addEventListener('change', loadHeatmapData);
        }

        // Initial Load
        loadHeatmapData();
    }

    async function loadHeatmapData() {
        console.log('Heatmap: Fetching data from Supabase...');
        const supabase = window.auth?.supabase?.value;
        if (!supabase) {
            console.warn('Supabase client not yet available for heatmap load. Retrying in 1s...');
            setTimeout(loadHeatmapData, 1000);
            return;
        }

        const city = document.getElementById('map-filter-city')?.value || 'Mumbai';
        const type = document.getElementById('map-filter-type')?.value || 'all';

        console.log(`Heatmap Query: City="${city}", Type="${type}"`);

        let query = supabase.from('waste_reports').select('latitude, longitude, waste_type').eq('city', city);
        
        if (type !== 'all') {
            query = query.eq('waste_type', type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase ERROR fetching waste reports:', error);
            // Don't die, just show whatever we have
            return;
        }

        console.log(`Heatmap: Successfully fetched ${data?.length || 0} reports.`);
        renderHeatmap(data || []);
    }

    function renderHeatmap(data) {
        if (heatLayer) map.removeLayer(heatLayer);

        const heatPoints = data.map(d => [d.latitude, d.longitude, 0.6]);

        heatLayer = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {
                0.2: '#22c55e',
                0.4: '#eab308',
                0.6: '#f97316',
                1.0: '#ef4444'
            }
        }).addTo(map);
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', initHeatmap);

    // Export for manual refresh
    window.refreshHeatmap = loadHeatmapData;
})();
