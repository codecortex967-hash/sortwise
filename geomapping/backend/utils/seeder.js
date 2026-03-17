const Waste = require('../models/Waste');

const clusters = [
    { name: 'Bandra', center: [72.8295, 19.0596], radius: 0.015, count: 60, dist: { Plastic: 0.7, Organic: 0.2, Metal: 0.1 }, city: 'Mumbai' },
    { name: 'Dadar', center: [72.8478, 19.0178], radius: 0.01, count: 50, dist: { Plastic: 0.1, Organic: 0.8, Metal: 0.1 }, city: 'Mumbai' },
    { name: 'Juhu', center: [72.8267, 19.1048], radius: 0.02, count: 40, dist: { Plastic: 0.3, Organic: 0.3, Metal: 0.4 }, city: 'Mumbai' },
    
    // Indore Clusters
    { name: 'Vijay Nagar', center: [75.8943, 22.7533], radius: 0.015, count: 70, dist: { Plastic: 0.6, Organic: 0.3, Metal: 0.1 }, city: 'Indore' },
    { name: 'Rajwada', center: [75.8577, 22.7196], radius: 0.01, count: 80, dist: { Plastic: 0.4, Organic: 0.4, Metal: 0.2 }, city: 'Indore' },
    { name: 'Palasia', center: [75.8823, 22.7244], radius: 0.012, count: 50, dist: { Plastic: 0.2, Organic: 0.7, Metal: 0.1 }, city: 'Indore' },
    { name: 'Bhanwarkuan', center: [75.8690, 22.6916], radius: 0.018, count: 60, dist: { Plastic: 0.5, Organic: 0.4, Metal: 0.1 }, city: 'Indore' }
];

/**
 * Generates clustered demo data and inserts it into the database.
 * @param {boolean} force - If true, clears existing data before seeding.
 */
async function seedDemoData(force = false) {
    if (force) {
        await Waste.deleteMany({});
    }

    const reports = [];
    clusters.forEach(c => {
        for (let i = 0; i < c.count; i++) {
            const u = Math.random(), v = Math.random();
            const w = c.radius * Math.sqrt(u);
            const t = 2 * Math.PI * v;
            const x = w * Math.cos(t), y = w * Math.sin(t);
            
            const types = Object.keys(c.dist);
            let rand = Math.random(), cumul = 0, type = 'Plastic';
            for (const t of types) {
                cumul += c.dist[t];
                if (rand < cumul) { type = t; break; }
            }

            reports.push({
                waste_type: type,
                location: { type: 'Point', coordinates: [c.center[0] + x, c.center[1] + y] },
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            });
        }
    });

    await Waste.insertMany(reports);
    return reports.length;
}

/**
 * Generates clustered demo data in-memory (no database required).
 * @param {string} city - Filter clusters by city (Mumbai or Indore)
 * @param {string} type - Filter reports by waste type (optional)
 */
function generateMockData(city = 'Mumbai', type = null) {
    let reports = [];
    const filteredClusters = clusters.filter(c => c.city === city);
    
    filteredClusters.forEach(c => {
        for (let i = 0; i < c.count; i++) {
            const u = Math.random(), v = Math.random();
            const w = c.radius * Math.sqrt(u);
            const t = 2 * Math.PI * v;
            const x = w * Math.cos(t), y = w * Math.sin(t);
            
            const types = Object.keys(c.dist);
            let rand = Math.random(), cumul = 0, itemType = 'Plastic';
            for (const t of types) {
                cumul += c.dist[t];
                if (rand < cumul) { itemType = t; break; }
            }

            reports.push({
                _id: `mock_${Math.random().toString(36).substr(2, 9)}`,
                wasteType: itemType,
                latitude: c.center[1] + y,
                longitude: c.center[0] + x,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            });
        }
    });

    if (type && type !== 'all') {
        reports = reports.filter(r => r.wasteType === type);
    }

    return reports;
}

module.exports = { seedDemoData, generateMockData };
