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

    // Hardcoded Dummy Data for Presentation
    const DUMMY_REPORTS = [
        // --- MUMBAI HOTSPOTS (Dense Clusters) ---
        // Cluster 1: Dharavi Area
        { latitude: 19.0380, longitude: 72.8538, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.0382, longitude: 72.8540, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.0385, longitude: 72.8542, city: 'Mumbai', waste_type: 'Organic' },
        { latitude: 19.0378, longitude: 72.8535, city: 'Mumbai', waste_type: 'Metal' },
        { latitude: 19.0390, longitude: 72.8550, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.0370, longitude: 72.8520, city: 'Mumbai', waste_type: 'Organic' },
        
        // Cluster 2: Juhu Beach
        { latitude: 19.1075, longitude: 72.8263, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.1080, longitude: 72.8270, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.1070, longitude: 72.8255, city: 'Mumbai', waste_type: 'Organic' },
        { latitude: 19.1090, longitude: 72.8280, city: 'Mumbai', waste_type: 'Metal' },
        { latitude: 19.1065, longitude: 72.8250, city: 'Mumbai', waste_type: 'Plastic' },
        
        // Cluster 3: Deonar 
        { latitude: 19.0645, longitude: 72.9165, city: 'Mumbai', waste_type: 'Metal' },
        { latitude: 19.0650, longitude: 72.9170, city: 'Mumbai', waste_type: 'Plastic' },
        { latitude: 19.0640, longitude: 72.9160, city: 'Mumbai', waste_type: 'Organic' },

        // --- INDORE HOTSPOTS (Dense Clusters) ---
        // Cluster 1: Rajwada
        { latitude: 22.7196, longitude: 75.8577, city: 'Indore', waste_type: 'Organic' },
        { latitude: 22.7200, longitude: 75.8585, city: 'Indore', waste_type: 'Plastic' },
        { latitude: 22.7190, longitude: 75.8565, city: 'Indore', waste_type: 'Metal' },
        { latitude: 22.7210, longitude: 75.8590, city: 'Indore', waste_type: 'Organic' },
        { latitude: 22.7180, longitude: 75.8550, city: 'Indore', waste_type: 'Plastic' },
        
        // Cluster 2: Vijay Nagar
        { latitude: 22.7533, longitude: 75.8937, city: 'Indore', waste_type: 'Plastic' },
        { latitude: 22.7540, longitude: 75.8945, city: 'Indore', waste_type: 'Plastic' },
        { latitude: 22.7525, longitude: 75.8925, city: 'Indore', waste_type: 'Metal' },
        { latitude: 22.7550, longitude: 75.8950, city: 'Indore', waste_type: 'Organic' },
        { latitude: 22.7520, longitude: 75.8910, city: 'Indore', waste_type: 'Plastic' }
    ];

    async function loadHeatmapData() {
        console.log('Heatmap: Loading hardcoded dummy data for showcase...');
        
        const city = document.getElementById('map-filter-city')?.value || 'Mumbai';
        const type = document.getElementById('map-filter-type')?.value || 'all';

        console.log(`Heatmap Filter: City="${city}", Type="${type}"`);

        // Filter the hardcoded array
        let filteredData = DUMMY_REPORTS.filter(d => d.city === city);
        
        if (type !== 'all') {
            filteredData = filteredData.filter(d => d.waste_type === type);
        }

        console.log(`Heatmap: Displaying ${filteredData.length} static reports.`);
        renderHeatmap(filteredData);
    }

    function renderHeatmap(data) {
        if (heatLayer) map.removeLayer(heatLayer);
        
        // Remove existing debug markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Points for Heatmap (lat, lng, intensity)
        const heatPoints = data.map(d => [d.latitude, d.longitude, 1.0]);

        console.log(`Rendering ${heatPoints.length} points onto heat layer.`);

        heatLayer = L.heatLayer(heatPoints, {
            radius: 35, // Increased radius for better visibility
            blur: 20,   // Increased blur
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        // Group data by proximity to add meaningful labels (Presentation Mode)
        const clusters = {
            'Mumbai': [
                { lat: 19.0380, lng: 72.8538, type: 'Plastic' },
                { lat: 19.1075, lng: 72.8263, type: 'Plastic' },
                { lat: 19.0645, lng: 72.9165, type: 'Metal' }
            ],
            'Indore': [
                { lat: 22.7196, lng: 75.8577, type: 'Organic' },
                { lat: 22.7533, lng: 75.8937, type: 'Plastic' }
            ]
        };

        const currentCity = document.getElementById('map-filter-city')?.value || 'Mumbai';
        const currentType = document.getElementById('map-filter-type')?.value || 'all';

        if (clusters[currentCity]) {
            clusters[currentCity].forEach(c => {
                // Only show label if it matches the current filter
                if (currentType === 'all' || c.type === currentType) {
                    L.marker([c.lat, c.lng], {
                        icon: L.divIcon({
                            className: 'hotspot-label',
                            html: `<div style="background: rgba(239, 68, 68, 0.9); border: 1px solid white; border-radius: 6px; padding: 4px 10px; font-weight: bold; font-size: 0.85rem; color: white; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transform: translateY(-10px);">
                                    ⚠️ Hotspot Zone: ${c.type}
                                   </div>`,
                            iconSize: [140, 40],
                            iconAnchor: [70, 20]
                        })
                    }).addTo(map);
                }
            });
        }
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', initHeatmap);

    // Export for manual refresh
    window.refreshHeatmap = loadHeatmapData;
})();
