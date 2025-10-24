const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { patientValidations, commonValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// GET /api/patients - Get all patients
router.get('/', protect, restrictTo('superadmin', 'receptionist'), commonValidations.pagination(), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const query = { role: 'patient' };

    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const patients = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.json({
      patients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
});

// GET /api/patients/me - Get current patient's own data
router.get('/me', protect, restrictTo('patient'), async (req, res) => {
  try {
    const patient = await User.findById(req.user.id).select('-password');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient data', error: error.message });
  }
});

// GET /api/patients/:id - Get patient by ID
router.get('/:id', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, role: 'patient' }).select('-password');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient', error: error.message });
  }
});

// POST /api/patients - Create new patient (superadmin/receptionist only)
router.post('/', protect, restrictTo('superadmin', 'receptionist'), patientValidations.create, async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      role: 'patient'
    };
    
    const patient = new User(patientData);
    await patient.save();
    
    // Log patient creation
    logHelpers.logCreate('patient', patient._id, req.user._id, req.user.email, req.body);
    
    res.status(201).json({
      _id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      medicalHistory: patient.medicalHistory,
      allergies: patient.allergies,
      medications: patient.medications,
      insuranceInfo: patient.insuranceInfo,
      status: patient.status,
      role: patient.role,
      createdAt: patient.createdAt
    });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'patient_creation',
      userId: req.user._id,
      email: req.user.email
    });
    
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Error creating patient', error: error.message });
    }
  }
});

// PUT /api/patients/:id - Update patient (superadmin/receptionist only)
router.put('/:id', protect, restrictTo('superadmin', 'receptionist'), patientValidations.update, async (req, res) => {
  try {
    const patient = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'patient' },
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Log patient update
    logHelpers.logUpdate('patient', patient._id, req.user._id, req.user.email, req.body);

    res.json(patient);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'patient_update',
      patientId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Error updating patient', error: error.message });
    }
  }
});

// PATCH /api/patients/me - Update own profile (patients only)
router.patch('/me', protect, restrictTo('patient'), patientValidations.update, async (req, res) => {
  try {
    const patient = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Log patient update
    logHelpers.logUpdate('patient', patient._id, req.user._id, req.user.email, req.body);

    res.json(patient);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'patient_profile_update',
      patientId: req.user.id,
      userId: req.user._id,
      email: req.user.email
    });
    
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
  }
});

// DELETE /api/patients/:id - Delete patient (superadmin only)
router.delete('/:id', protect, restrictTo('superadmin'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const patient = await User.findOneAndDelete({ _id: req.params.id, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Log patient deletion
    logHelpers.logDelete('patient', patient._id, req.user._id, req.user.email);

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'patient_deletion',
      patientId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error deleting patient', error: error.message });
  }
});

// GET /api/patients/:id/appointments - Get patient's appointments
router.get('/:id/appointments', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const appointments = await require('../models/Appointment').find({ patientId: req.params.id })
      .populate('receptionistId', 'firstName lastName')
      .sort({ appointmentDate: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient appointments', error: error.message });
  }
});

// GET /api/patients/me/appointments - Get own appointments (patients only)
router.get('/me/appointments', protect, restrictTo('patient'), async (req, res) => {
  try {
    const appointments = await require('../models/Appointment').find({ patientId: req.user.id })
      .populate('receptionistId', 'firstName lastName')
      .sort({ appointmentDate: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

module.exports = router;
