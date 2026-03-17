require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const wasteRoutes = require('./routes/wasteRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// INTEGRATION POINT: Middleware
// Adjust CORS settings if integrating into a multi-origin system
// ==========================================
app.use(cors());
app.use(express.json());

// Database connection
const mongoURI = process.env.MONGO_URI;
const Waste = require('./models/Waste');
const { seedDemoData } = require('./utils/seeder');

mongoose.connect(mongoURI)
.then(async () => {
    console.log('MongoDB connected successfully');
    
    // Automatic seeding if database is empty
    try {
        const count = await Waste.countDocuments();
        if (count === 0) {
            console.log('Database is empty. Automatically generating demo data...');
            const seededCount = await seedDemoData();
            console.log(`Successfully seeded ${seededCount} demo reports.`);
        }
    } catch (seedErr) {
        console.error('Error during automatic seeding:', seedErr);
    }
})
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.get('/api/status', (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ status, database: 'MongoDB' });
});

app.use('/api/waste', wasteRoutes);

// Serve Static Frontend
app.use(express.static(path.join(__dirname, '../frontend')));
// Fallback for HTML
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
