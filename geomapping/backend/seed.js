require('dotenv').config();
const mongoose = require('mongoose');
const Waste = require('./models/Waste');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geomapping_waste';

// Configuration for clusters
const clusters = [
    {
        name: 'Area A (Bandra)',
        center: { lat: 19.0596, lng: 72.8295 },
        radius: 0.015, // degrees ~1.5km
        count: 100,
        typeDistribution: { 'Plastic': 0.7, 'Organic': 0.2, 'Metal': 0.1 }
    },
    {
        name: 'Area B (Dadar)',
        center: { lat: 19.0178, lng: 72.8478 },
        radius: 0.01,
        count: 80,
        typeDistribution: { 'Plastic': 0.1, 'Organic': 0.8, 'Metal': 0.1 }
    },
    {
        name: 'Area C (Juhu)',
        center: { lat: 19.1048, lng: 72.8267 },
        radius: 0.02,
        count: 50,
        typeDistribution: { 'Plastic': 0.3, 'Organic': 0.3, 'Metal': 0.4 }
    },
    {
        name: 'Area D (Powai)',
        center: { lat: 19.1176, lng: 72.9060 },
        radius: 0.025,
        count: 20,
        typeDistribution: { 'Plastic': 0.3, 'Organic': 0.4, 'Metal': 0.3 }
    }
];

function getRandomType(distribution) {
    const rand = Math.random();
    let cumulative = 0;
    for (const [type, weight] of Object.entries(distribution)) {
        cumulative += weight;
        if (rand < cumulative) return type;
    }
    return 'Plastic';
}

function getRandomTimestamp() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7); // up to 7 days ago
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
    return date;
}

async function seedData() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await Waste.deleteMany({});
        console.log('Cleared existing waste reports.');

        const allReports = [];

        clusters.forEach(cluster => {
            console.log(`Generating ${cluster.count} reports for ${cluster.name}...`);
            for (let i = 0; i < cluster.count; i++) {
                // Jitter coordinates within radius using Gaussian-like distribution (box-muller)
                const u1 = Math.random();
                const u2 = Math.random();
                const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

                const lat = cluster.center.lat + (z0 * cluster.radius);
                const lng = cluster.center.lng + (z1 * cluster.radius);

                allReports.push({
                    waste_type: getRandomType(cluster.typeDistribution),
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat] // [longitude, latitude]
                    },
                    createdAt: getRandomTimestamp()
                });
            }
        });

        await Waste.insertMany(allReports);
        console.log(`Successfully seeded ${allReports.length} waste reports!`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
