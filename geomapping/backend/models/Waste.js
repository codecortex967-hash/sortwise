const mongoose = require('mongoose');

const wasteSchema = new mongoose.Schema({
  waste_type: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { 
  bufferCommands: false, // Fail fast if not connected
  autoIndex: true 
});

wasteSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Waste', wasteSchema);
