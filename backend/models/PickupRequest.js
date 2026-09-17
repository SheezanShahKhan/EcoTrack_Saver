const mongoose = require('mongoose');

const pickupRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    location: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Progress', 'Completed'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);
