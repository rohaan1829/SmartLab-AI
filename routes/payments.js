const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect, restrictTo } = require('../middleware/auth');
const { paymentValidations, commonValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// GET /api/payments - Get all payments
router.get('/', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10, patientId, paymentStatus, paymentMethod } = req.query;
    const query = {};

    // Add filters
    if (patientId) query.patientId = patientId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
});

// GET /api/payments/my - Get current user's payments
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, paymentStatus, paymentMethod } = req.query;
    const query = {};

    // Patients can only see their own payments
    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    }
    // Receptionists can see payments they created
    else if (req.user.role === 'receptionist') {
      query.createdBy = req.user.id;
    }

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
});

// GET /api/payments/:id - Get payment by ID
router.get('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user can access this payment
    if (req.user.role === 'patient' && payment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment', error: error.message });
  }
});

// POST /api/payments - Create new payment
router.post('/', protect, restrictTo('superadmin', 'receptionist'), paymentValidations.create, async (req, res) => {
  try {
    // Check if patient exists
    const patient = await User.findOne({ _id: req.body.patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if appointment exists (if provided)
    if (req.body.appointmentId) {
      const appointment = await Appointment.findById(req.body.appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    const paymentData = {
      ...req.body,
      createdBy: req.user.id,
      paymentStatus: 'Pending' // All new payments start as pending
    };

    const payment = new Payment(paymentData);
    await payment.save();
    
    // Populate the created payment
    await payment.populate('patientId', 'firstName lastName email phone');
    await payment.populate('appointmentId', 'appointmentDate reason type');
    await payment.populate('createdBy', 'firstName lastName');
    
    // Log payment creation
    logHelpers.logCreate('payment', payment._id, req.user._id, req.user.email, req.body);
    
    res.status(201).json(payment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'payment_creation',
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error creating payment', error: error.message });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', protect, restrictTo('superadmin', 'receptionist'), paymentValidations.update, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only creator or superadmin can update
    if (payment.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can't update completed payments
    if (payment.paymentStatus === 'Paid' && req.user.role !== 'superadmin') {
      return res.status(400).json({ message: 'Cannot update completed payments' });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('appointmentId', 'appointmentDate reason type')
     .populate('createdBy', 'firstName lastName');

    // Log payment update
    logHelpers.logUpdate('payment', payment._id, req.user._id, req.user.email, req.body);

    res.json(updatedPayment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'payment_update',
      paymentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating payment', error: error.message });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', protect, restrictTo('superadmin'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Log payment deletion
    logHelpers.logDelete('payment', payment._id, req.user._id, req.user.email);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'payment_deletion',
      paymentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error deleting payment', error: error.message });
  }
});

// PATCH /api/payments/:id/status - Update payment status
router.patch('/:id/status', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { paymentStatus, paymentDetails } = req.body;
    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Paid'];
    
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only creator or superadmin can update status
    if (payment.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = { 
      paymentStatus,
      paymentDate: paymentStatus === 'Paid' ? new Date() : undefined
    };

    if (paymentDetails) {
      updateData.paymentDetails = paymentDetails;
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('appointmentId', 'appointmentDate reason type')
     .populate('createdBy', 'firstName lastName');

    // Log status update
    logHelpers.logUpdate('payment', payment._id, req.user._id, req.user.email, { paymentStatus });

    res.json(updatedPayment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'payment_status_update',
      paymentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating payment status', error: error.message });
  }
});

// GET /api/payments/patient/:patientId - Get all payments for a specific patient
router.get('/patient/:patientId', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('patientId'), async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.query;
    const query = { patientId: req.params.patientId };

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient payments', error: error.message });
  }
});

// GET /api/payments/patient/me - Get own payments (patients only)
router.get('/patient/me', protect, restrictTo('patient'), async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.query;
    const query = { patientId: req.user.id };

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
});

// GET /api/payments/overdue - Get overdue payments
router.get('/overdue', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const today = new Date();
    const overduePayments = await Payment.find({
      dueDate: { $lt: today },
      paymentStatus: { $in: ['Pending', 'Partially Paid'] }
    })
    .populate('patientId', 'firstName lastName email phone')
    .populate('appointmentId', 'appointmentDate reason type')
    .populate('createdBy', 'firstName lastName')
    .sort({ dueDate: 1 });

    res.json(overduePayments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overdue payments', error: error.message });
  }
});

// POST /api/payments/:id/refund - Process refund
router.post('/:id/refund', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { refundAmount, refundReason, refundMethod } = req.body;
    
    if (!refundAmount || !refundReason || !refundMethod) {
      return res.status(400).json({ message: 'Refund information is required' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only creator or superadmin can process refunds
    if (payment.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (refundAmount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
    }

    const updateData = {
      refundInfo: {
        refundAmount,
        refundDate: new Date(),
        refundReason,
        refundMethod,
        processedBy: req.user.id
      },
      paymentStatus: refundAmount === payment.amount ? 'Refunded' : 'Partially Paid'
    };

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email phone')
     .populate('appointmentId', 'appointmentDate reason type')
     .populate('createdBy', 'firstName lastName');

    // Log refund processing
    logHelpers.logUpdate('payment', payment._id, req.user._id, req.user.email, { refundProcessed: true, refundAmount });

    res.json(updatedPayment);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'payment_refund',
      paymentId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error processing refund', error: error.message });
  }
});

// GET /api/payments/stats/summary - Get payment statistics
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

    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalPayments = await Payment.countDocuments(query);
    const totalAmount = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      statusBreakdown: stats,
      totalPayments,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment statistics', error: error.message });
  }
});

module.exports = router;
