const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    wasteType: {
      type: String,
      enum: ['Household', 'Recyclable', 'Organic', 'E-waste', 'Hazardous', 'Other'],
      required: true
    },
    description: { type: String, required: true },
    image: { type: String, default: null }, // stored file path, e.g. /uploads/xyz.jpg
    location: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Progress', 'Completed'],
      default: 'Pending'
    },
    assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    proofImage: { type: String, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true } // gives us createdAt for reporting/resolution-time stats
);

module.exports = mongoose.model('WasteReport', wasteReportSchema);
