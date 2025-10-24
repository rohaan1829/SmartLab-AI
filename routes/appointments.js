const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { appointmentValidations, commonValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// GET /api/appointments - Get all appointments
router.get('/', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10, patientId, receptionistId, status, date } = req.query;
    const query = {};

    // Add filters
    if (patientId) query.patientId = patientId;
    if (receptionistId) query.receptionistId = receptionistId;
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('receptionistId', 'firstName lastName')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// GET /api/appointments/my - Get current user's appointments
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};

    // Patients can only see their own appointments
    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    }
    // Receptionists can see appointments they're handling
    else if (req.user.role === 'receptionist') {
      query.receptionistId = req.user.id;
    }

    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('receptionistId', 'firstName lastName')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// GET /api/appointments/pending - Get pending appointments for approval
router.get('/pending', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const appointments = await Appointment.find({ status: 'Pending' })
      .populate('patientId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Appointment.countDocuments({ status: 'Pending' });

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending appointments', error: error.message });
  }
});

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone dateOfBirth')
      .populate('receptionistId', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user can access this appointment
    if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment', error: error.message });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', protect, restrictTo('patient'), appointmentValidations.create, async (req, res) => {
  try {
    console.log('Appointment creation request body:', JSON.stringify(req.body, null, 2));
    
    // Check if patient exists
    const patient = await User.findOne({ _id: req.body.patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Ensure patient can only create appointments for themselves
    if (req.user.role === 'patient' && req.body.patientId !== req.user.id) {
      return res.status(403).json({ message: 'You can only create appointments for yourself' });
    }

    const appointmentData = {
      ...req.body,
      status: 'Pending' // All new appointments start as pending
    };

    console.log('Appointment data to save:', JSON.stringify(appointmentData, null, 2));

    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    // Populate the created appointment
    await appointment.populate('patientId', 'firstName lastName email phone');
    
    // Log appointment creation
    logHelpers.logCreate('appointment', appointment._id, req.user._id, req.user.email, req.body);
    
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Appointment creation error:', error);
    logHelpers.logError(error, { 
      context: 'appointment_creation',
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
});

// POST /api/appointments/:id/approve - Approve appointment
router.post('/:id/approve', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Approved',
        receptionistId: req.user.id,
        approvalNotes,
        approvedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Log appointment approval
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, { status: 'Approved', approvalNotes });

    res.json(appointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'appointment_approval',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error approving appointment', error: error.message });
  }
});

// POST /api/appointments/:id/reject - Reject appointment
router.post('/:id/reject', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rejected',
        receptionistId: req.user.id,
        rejectionReason,
        rejectedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Log appointment rejection
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, { status: 'Rejected', rejectionReason });

    res.json(appointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'appointment_rejection',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error rejecting appointment', error: error.message });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', protect, appointmentValidations.update, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    if (req.user.role === 'patient' && appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Patients can only update pending appointments
    if (req.user.role === 'patient' && appointment.status !== 'Pending') {
      return res.status(403).json({ message: 'You can only modify pending appointments' });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    // Log appointment update
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, req.body);

    res.json(updatedAppointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'appointment_update',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating appointment', error: error.message });
  }
});

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    if (req.user.role === 'patient' && appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Patients can only delete pending appointments
    if (req.user.role === 'patient' && appointment.status !== 'Pending') {
      return res.status(403).json({ message: 'You can only delete pending appointments' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    // Log appointment deletion
    logHelpers.logDelete('appointment', appointment._id, req.user._id, req.user.email);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'appointment_deletion',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error deleting appointment', error: error.message });
  }
});

// PATCH /api/appointments/:id/status - Update appointment status
router.patch('/:id/status', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'No Show'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Log status update
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, { status });

    res.json(appointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'appointment_status_update',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating appointment status', error: error.message });
  }
});

// POST /api/appointments/:id/home-collection - Request home collection
router.post('/:id/home-collection', protect, restrictTo('patient'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { collectionAddress, collectionDate, collectionTime } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if patient owns this appointment
    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only approved appointments can request home collection
    if (appointment.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved appointments can request home collection' });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        'homeCollection.requested': true,
        'homeCollection.collectionAddress': collectionAddress,
        'homeCollection.collectionDate': collectionDate,
        'homeCollection.collectionTime': collectionTime
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    // Log home collection request
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, { homeCollectionRequested: true });

    res.json(updatedAppointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'home_collection_request',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error requesting home collection', error: error.message });
  }
});

// PATCH /api/appointments/:id/home-collection/approve - Approve home collection
router.patch('/:id/home-collection/approve', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { collectorId } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        'homeCollection.approved': true,
        'homeCollection.collectorId': collectorId
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('receptionistId', 'firstName lastName');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Log home collection approval
    logHelpers.logUpdate('appointment', appointment._id, req.user._id, req.user.email, { homeCollectionApproved: true });

    res.json(appointment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'home_collection_approval',
      appointmentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error approving home collection', error: error.message });
  }
});

// GET /api/appointments/upcoming/:receptionistId - Get upcoming appointments for a receptionist
router.get('/upcoming/:receptionistId', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const today = new Date();
    
    const appointments = await Appointment.find({
      receptionistId: req.params.receptionistId,
      appointmentDate: { $gte: today },
      status: { $in: ['Approved'] }
    })
    .populate('patientId', 'firstName lastName email phone')
    .sort({ appointmentDate: 1 })
    .limit(parseInt(limit));

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming appointments', error: error.message });
  }
});

module.exports = router;
