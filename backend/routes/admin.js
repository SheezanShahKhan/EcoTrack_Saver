const express = require('express');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect, allowRoles('admin'));

// GET /api/admin/dashboard — summary stats for the admin dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [total, pending, assigned, inProgress, completedReports] = await Promise.all([
      WasteReport.countDocuments(),
      WasteReport.countDocuments({ status: 'Pending' }),
      WasteReport.countDocuments({ status: 'Assigned' }),
      WasteReport.countDocuments({ status: 'In Progress' }),
      WasteReport.find({ status: 'Completed' })
    ]);

    let avgResolutionDays = 0;
    if (completedReports.length) {
      const totalMs = completedReports.reduce(
        (sum, r) => sum + (r.completedAt - r.createdAt),
        0
      );
      avgResolutionDays = +(totalMs / completedReports.length / (1000 * 60 * 60 * 24)).toFixed(1);
    }

    const byWasteType = await WasteReport.aggregate([
      { $group: { _id: '$wasteType', count: { $sum: 1 } } }
    ]);

    const topLocations = await WasteReport.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      total,
      pending,
      assigned,
      inProgress,
      completed: completedReports.length,
      avgResolutionDays,
      byWasteType,
      topLocations
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load dashboard', error: err.message });
  }
});

// GET /api/admin/reports — every report, with optional filters (same as GET /api/reports for admins,
// kept separate to match the route the doc's spec calls out for the admin view)
router.get('/reports', async (req, res) => {
  try {
    const { status, wasteType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (wasteType) filter.wasteType = wasteType;

    const reports = await WasteReport.find(filter)
      .populate('userId', 'name email')
      .populate('assignedCollector', 'name')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch reports', error: err.message });
  }
});

// PUT /api/admin/assign — assign a collector to a report
router.put('/assign', async (req, res) => {
  try {
    const { reportId, collectorId } = req.body;
    if (!reportId || !collectorId) {
      return res.status(400).json({ message: 'reportId and collectorId are required' });
    }

    const collector = await User.findOne({ _id: collectorId, role: 'collector' });
    if (!collector) return res.status(404).json({ message: 'Collector not found' });

    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.assignedCollector = collector._id;
    report.status = 'Assigned';
    await report.save();

    await Notification.create({
      userId: report.userId,
      message: `Your report was assigned to ${collector.name}.`
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Could not assign collector', error: err.message });
  }
});

module.exports = router;
