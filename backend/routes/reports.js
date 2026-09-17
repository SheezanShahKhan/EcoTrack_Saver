const express = require('express');
const WasteReport = require('../models/WasteReport');
const Notification = require('../models/Notification');
const { protect, allowRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect); // every route below requires a logged-in user

// POST /api/reports  — citizen submits a new report
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { wasteType, description, location } = req.body;
    if (!wasteType || !description || !location) {
      return res.status(400).json({ message: 'wasteType, description and location are required' });
    }

    const report = await WasteReport.create({
      userId: req.user._id,
      wasteType,
      description,
      location,
      image: req.file ? `/uploads/${req.file.filename}` : null
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: 'Could not create report', error: err.message });
  }
});

// GET /api/reports — citizens see their own, collectors/admins see everything (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, wasteType, search } = req.query;
    const filter = {};

    if (req.user.role === 'citizen') {
      filter.userId = req.user._id;
    } else if (req.user.role === 'collector') {
      filter.assignedCollector = req.user._id;
    }
    // admins get no automatic filter — they can see everything

    if (status) filter.status = status;
    if (wasteType) filter.wasteType = wasteType;
    if (search) filter.location = { $regex: search, $options: 'i' };

    const reports = await WasteReport.find(filter)
      .populate('userId', 'name email')
      .populate('assignedCollector', 'name')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch reports', error: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedCollector', 'name');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    const isOwner = report.userId._id.toString() === req.user._id.toString();
    const isAssignedCollector =
      report.assignedCollector && report.assignedCollector._id.toString() === req.user._id.toString();

    if (req.user.role === 'citizen' && !isOwner) {
      return res.status(403).json({ message: 'You can only view your own reports' });
    }
    if (req.user.role === 'collector' && !isAssignedCollector) {
      return res.status(403).json({ message: 'This report is not assigned to you' });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch report', error: err.message });
  }
});

// PUT /api/reports/:id — collectors update status/proof, admins can edit anything, owners can edit while still Pending
router.put('/:id', upload.single('proofPhoto'), async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const isOwner = report.userId.toString() === req.user._id.toString();
    const isAssignedCollector =
      report.assignedCollector && report.assignedCollector.toString() === req.user._id.toString();

    if (req.user.role === 'citizen') {
      if (!isOwner || report.status !== 'Pending') {
        return res.status(403).json({ message: 'You can only edit your own report before it is assigned' });
      }
      const { wasteType, description, location } = req.body;
      if (wasteType) report.wasteType = wasteType;
      if (description) report.description = description;
      if (location) report.location = location;
    }

    if (req.user.role === 'collector') {
      if (!isAssignedCollector) {
        return res.status(403).json({ message: 'This report is not assigned to you' });
      }
      const { status } = req.body;
      if (status && ['In Progress', 'Completed'].includes(status)) {
        report.status = status;
        if (status === 'Completed') {
          report.completedAt = new Date();
          if (req.file) report.proofImage = `/uploads/${req.file.filename}`;
        }
      }
    }

    if (req.user.role === 'admin') {
      Object.assign(report, req.body);
    }

    await report.save();

    if (req.user.role === 'collector' && req.body.status) {
      await Notification.create({
        userId: report.userId,
        message: `Your report is now marked "${report.status}".`
      });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Could not update report', error: err.message });
  }
});

// DELETE /api/reports/:id — owner (while pending) or admin
router.delete('/:id', async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const isOwner = report.userId.toString() === req.user._id.toString();

    if (req.user.role === 'citizen' && (!isOwner || report.status !== 'Pending')) {
      return res.status(403).json({ message: 'You can only delete your own report before it is assigned' });
    }
    if (req.user.role === 'collector') {
      return res.status(403).json({ message: 'Collectors cannot delete reports' });
    }

    await report.deleteOne();
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete report', error: err.message });
  }
});

module.exports = router;
