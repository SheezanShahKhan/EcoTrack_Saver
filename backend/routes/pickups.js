const express = require('express');
const PickupRequest = require('../models/PickupRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// POST /api/pickups — citizen requests a scheduled pickup
router.post('/', async (req, res) => {
  try {
    const { location, scheduledDate } = req.body;
    if (!location || !scheduledDate) {
      return res.status(400).json({ message: 'location and scheduledDate are required' });
    }

    const pickup = await PickupRequest.create({
      userId: req.user._id,
      location,
      scheduledDate
    });

    res.status(201).json(pickup);
  } catch (err) {
    res.status(500).json({ message: 'Could not create pickup request', error: err.message });
  }
});

// GET /api/pickups
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'citizen') filter.userId = req.user._id;
    if (req.user.role === 'collector') filter.collectorId = req.user._id;

    const pickups = await PickupRequest.find(filter)
      .populate('userId', 'name email')
      .populate('collectorId', 'name')
      .sort({ scheduledDate: 1 });

    res.json(pickups);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch pickups', error: err.message });
  }
});

// PUT /api/pickups/:id — admin assigns a collector, or collector updates status
router.put('/:id', async (req, res) => {
  try {
    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ message: 'Pickup request not found' });

    if (req.user.role === 'admin') {
      const { collectorId, status } = req.body;
      if (collectorId) {
        pickup.collectorId = collectorId;
        pickup.status = 'Assigned';
      }
      if (status) pickup.status = status;
    } else if (req.user.role === 'collector') {
      if (pickup.collectorId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'This pickup is not assigned to you' });
      }
      const { status } = req.body;
      if (status && ['In Progress', 'Completed'].includes(status)) {
        pickup.status = status;
      }
    } else {
      return res.status(403).json({ message: 'You do not have access to this action' });
    }

    await pickup.save();

    await Notification.create({
      userId: pickup.userId,
      message: `Your pickup request is now "${pickup.status}".`
    });

    res.json(pickup);
  } catch (err) {
    res.status(500).json({ message: 'Could not update pickup request', error: err.message });
  }
});

module.exports = router;
