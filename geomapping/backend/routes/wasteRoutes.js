const express = require('express');
const router = express.Router();
const Waste = require('../models/Waste');
const mongoose = require('mongoose');
const { seedDemoData, generateMockData } = require('../utils/seeder');

/**
 * INTEGRATION NOTE: 
 * If you change the database schema in models/Waste.js, 
 * ensure the 'coordinates' mapping in these routes is updated.
 */

// Fetch waste entries with optional filtering by type and time
router.get('/', async (req, res) => {
  const { type, timeRange, city } = req.query;

  // MOCK FALLBACK: Use mock data if database is disconnected
  if (mongoose.connection.readyState !== 1) {
    console.log(`Using Mock Data fallback for GET / (City: ${city || 'Mumbai'}, Type: ${type || 'all'})`);
    return res.json(generateMockData(city || 'Mumbai', type));
  }

  try {
    let query = {};

    if (type && type !== 'all') {
      query.waste_type = type;
    }

    if (timeRange === '24h') {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: yesterday };
    } else if (timeRange === '7d') {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: lastWeek };
    }

    const wasteData = await Waste.find(query);
    const formattedData = wasteData.map(item => ({
      _id: item._id,
      wasteType: item.waste_type,
      latitude: item.location.coordinates[1],
      longitude: item.location.coordinates[0],
      createdAt: item.createdAt
    }));
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching waste data:', error);
    res.status(500).json({ message: 'Server error fetching waste data' });
  }
});

// Analytics route: count by type and provide area insights
router.get('/analytics', async (req, res) => {
  const { city, type } = req.query;

  // MOCK FALLBACK: Use mock data if database is disconnected
  if (mongoose.connection.readyState !== 1) {
    console.log(`Using Mock Data fallback for GET /analytics (City: ${city || 'Mumbai'}, Type: ${type || 'all'})`);
    const mock = generateMockData(city || 'Mumbai', type);
    
    const stats = mock.reduce((acc, curr) => {
      acc[curr.wasteType] = (acc[curr.wasteType] || 0) + 1;
      return acc;
    }, {});
    
    // City & Type specific hotspots for mock mode
    let hotspots = [];
    let insights = [];

    if (city === 'Indore') {
        hotspots = [
            { lat: 22.7533, lng: 75.8943, count: 70, topType: 'Plastic' },
            { lat: 22.7196, lng: 75.8577, count: 80, topType: 'Mixed' },
            { lat: 22.7244, lng: 75.8823, count: 50, topType: 'Organic' }
        ];
        insights = [
            "Vijay Nagar shows high plastic accumulation near commercial areas.",
            "Rajwada market zone has high volume of mixed waste.",
            "Palasia residential area predominantly reports organic waste."
        ];
    } else {
        hotspots = [
            { lat: 19.0596, lng: 72.8295, count: 60, topType: 'Plastic' },
            { lat: 19.0178, lng: 72.8478, count: 50, topType: 'Organic' },
            { lat: 19.1048, lng: 72.8267, count: 40, topType: 'Mixed' }
        ];
        insights = [
            "Area near Bandra has high plastic concentration.", 
            "Area near Dadar has high organic concentration.",
            "Area near Juhu has mixed waste concentration."
        ];
    }

    // Filter hotspots/insights if type is specified
    if (type && type !== 'all') {
        hotspots = hotspots.filter(h => h.topType === type || h.topType === 'Mixed');
        insights = insights.filter(i => i.toLowerCase().includes(type.toLowerCase()));
        if (insights.length === 0) insights = [`Showing focused reports for ${type} in ${city || 'Mumbai'}.`];
    }

    return res.json({
      stats,
      insights,
      hotspots
    });
  }

  try {
    let match = {};
    if (type && type !== 'all') {
        match.waste_type = type;
    }

    // 1. Count by waste type
    const stats = await Waste.aggregate([
      { $match: match },
      { $group: { _id: '$waste_type', count: { $sum: 1 } } }
    ]);

    // 2. Cluster logic: Group by rounded lat/lng
    const areaInsightsData = await Waste.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            lat: { $multiply: [{ $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 1] }, 1] },
            lng: { $multiply: [{ $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 1] }, 1] }
          },
          count: { $sum: 1 },
          types: { $addToSet: '$waste_type' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    const formattedInsights = areaInsightsData.map(area => {
      const topType = area.types[0] || 'waste';
      return `Area near ${area._id.lat}, ${area._id.lng} has a high concentration of ${topType} (${area.count} reports).`;
    });

    const hotspots = areaInsightsData.map(area => ({
      lat: area._id.lat,
      lng: area._id.lng,
      count: area.count,
      topType: area.types[0] || 'Mixed'
    }));

    res.json({
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      insights: formattedInsights,
      hotspots
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// Submit a new waste entry location
router.post('/', async (req, res) => {
  // Check connection state
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database disconnected. Please check your MongoDB service.' });
  }

  try {
    const { waste_type, latitude, longitude } = req.body;
    
    if (!waste_type || !latitude || !longitude) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newWaste = new Waste({
      waste_type,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    const savedWaste = await newWaste.save();
    res.status(201).json({
      _id: savedWaste._id,
      wasteType: savedWaste.waste_type,
      latitude: savedWaste.location.coordinates[1],
      longitude: savedWaste.location.coordinates[0],
      createdAt: savedWaste.createdAt
    });
  } catch (error) {
    console.error('Error saving waste data:', error);
    res.status(500).json({ message: 'Server error saving waste data' });
  }
});

// Seed demo data
router.post('/seed', async (req, res) => {
  try {
    const seededCount = await seedDemoData(req.body.force);
    res.status(201).json({ message: `Successfully seeded ${seededCount} reports!`, count: seededCount });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ message: 'Error seeding demo data' });
  }
});

module.exports = router;
