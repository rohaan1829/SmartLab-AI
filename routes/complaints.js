const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { complaintValidations, commonValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// GET /api/complaints - Get all complaints
router.get('/', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, patientId } = req.query;
    const query = {};

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (patientId) query.patientId = patientId;

    const complaints = await Complaint.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments(query);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
});

// GET /api/complaints/my - Get current user's complaints
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};

    // Patients can only see their own complaints
    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    }
    // Receptionists can see complaints assigned to them
    else if (req.user.role === 'receptionist') {
      query.assignedTo = req.user.id;
    }

    if (status) query.status = status;

    const complaints = await Complaint.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments(query);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
});

// GET /api/complaints/pending - Get pending complaints
router.get('/pending', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const complaints = await Complaint.find({ status: 'Open' })
      .populate('patientId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments({ status: 'Open' });

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending complaints', error: error.message });
  }
});

// GET /api/complaints/:id - Get complaint by ID
router.get('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName');
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user can access this complaint
    if (req.user.role === 'patient' && complaint.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaint', error: error.message });
  }
});

// POST /api/complaints - Create new complaint
router.post('/', protect, restrictTo('patient'), complaintValidations.create, async (req, res) => {
  try {
    // Check if patient exists
    const patient = await User.findOne({ _id: req.body.patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Ensure patient can only create complaints for themselves
    if (req.user.role === 'patient' && req.body.patientId !== req.user.id) {
      return res.status(403).json({ message: 'You can only create complaints for yourself' });
    }

    const complaintData = {
      ...req.body,
      status: 'Open', // All new complaints start as open
      priority: req.body.priority || 'Medium' // Default priority
    };

    const complaint = new Complaint(complaintData);
    await complaint.save();
    
    // Populate the created complaint
    await complaint.populate('patientId', 'firstName lastName email phone');
    
    // Log complaint creation
    logHelpers.logCreate('complaint', complaint._id, req.user._id, req.user.email, req.body);
    
    res.status(201).json(complaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_creation',
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error creating complaint', error: error.message });
  }
});

// PUT /api/complaints/:id - Update complaint
router.put('/:id', protect, complaintValidations.update, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check permissions
    if (req.user.role === 'patient' && complaint.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Patients can only update open complaints
    if (req.user.role === 'patient' && complaint.status !== 'Open') {
      return res.status(403).json({ message: 'You can only modify open complaints' });
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('resolvedBy', 'firstName lastName');

    // Log complaint update
    logHelpers.logUpdate('complaint', complaint._id, req.user._id, req.user.email, req.body);

    res.json(updatedComplaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_update',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating complaint', error: error.message });
  }
});

// DELETE /api/complaints/:id - Delete complaint
router.delete('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check permissions
    if (req.user.role === 'patient' && complaint.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Patients can only delete open complaints
    if (req.user.role === 'patient' && complaint.status !== 'Open') {
      return res.status(403).json({ message: 'You can only delete open complaints' });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    // Log complaint deletion
    logHelpers.logDelete('complaint', complaint._id, req.user._id, req.user.email);

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_deletion',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error deleting complaint', error: error.message });
  }
});

// PATCH /api/complaints/:id/assign - Assign complaint to receptionist
router.patch('/:id/assign', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    // Check if assigned user exists and is a receptionist
    const assignedUser = await User.findOne({ _id: assignedTo, role: 'receptionist' });
    if (!assignedUser) {
      return res.status(404).json({ message: 'Receptionist not found' });
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo,
        assignedAt: new Date(),
        status: 'In Progress'
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('resolvedBy', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Log complaint assignment
    logHelpers.logUpdate('complaint', complaint._id, req.user._id, req.user.email, { assignedTo });

    res.json(complaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_assignment',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error assigning complaint', error: error.message });
  }
});

// PATCH /api/complaints/:id/resolve - Resolve complaint
router.patch('/:id/resolve', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { resolution, status } = req.body;
    
    if (!resolution) {
      return res.status(400).json({ message: 'Resolution is required' });
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        status: status || 'Resolved',
        resolution,
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('resolvedBy', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Log complaint resolution
    logHelpers.logUpdate('complaint', complaint._id, req.user._id, req.user.email, { status: 'Resolved', resolution });

    res.json(complaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_resolution',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error resolving complaint', error: error.message });
  }
});

// PATCH /api/complaints/:id/priority - Update complaint priority
router.patch('/:id/priority', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { priority } = req.body;
    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('resolvedBy', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Log priority update
    logHelpers.logUpdate('complaint', complaint._id, req.user._id, req.user.email, { priority });

    res.json(complaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_priority_update',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating complaint priority', error: error.message });
  }
});

// POST /api/complaints/:id/comments - Add comment to complaint
router.post('/:id/comments', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user can access this complaint
    if (req.user.role === 'patient' && complaint.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const commentData = {
      comment,
      commentedBy: req.user.id,
      commentedAt: new Date()
    };

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $push: { comments: commentData }
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('assignedTo', 'firstName lastName')
     .populate('resolvedBy', 'firstName lastName')
     .populate('comments.commentedBy', 'firstName lastName');

    // Log comment addition
    logHelpers.logUpdate('complaint', complaint._id, req.user._id, req.user.email, { commentAdded: true });

    res.json(updatedComplaint);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'complaint_comment',
      complaintId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
});

// GET /api/complaints/stats/summary - Get complaint statistics
router.get('/stats/summary', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalComplaints = await Complaint.countDocuments(query);
    const avgResolutionTime = await Complaint.aggregate([
      { $match: { ...query, resolvedAt: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgTime: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } }
        }
      }
    ]);

    res.json({
      statusBreakdown: stats,
      priorityBreakdown: priorityStats,
      totalComplaints,
      avgResolutionTimeHours: avgResolutionTime[0]?.avgTime ? avgResolutionTime[0].avgTime / (1000 * 60 * 60) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaint statistics', error: error.message });
  }
});

module.exports = router;
