const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect, restrictTo } = require('../middleware/auth');
const { reportValidations, commonValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// GET /api/reports - Get all reports
router.get('/', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10, patientId, reportType, status } = req.query;
    const query = {};

    // Add filters
    if (patientId) query.patientId = patientId;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('patientId', 'firstName lastName email')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// GET /api/reports/my - Get current user's reports
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};

    // Patients can only see their own reports
    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    }
    // Receptionists can see reports they created or reviewed
    else if (req.user.role === 'receptionist') {
      query.$or = [
        { createdBy: req.user.id },
        { reviewedBy: req.user.id }
      ];
    }

    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('patientId', 'firstName lastName email')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// GET /api/reports/pending - Get pending reports for review
router.get('/pending', protect, restrictTo('superadmin', 'receptionist'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await Report.find({ status: 'Pending Review' })
      .populate('patientId', 'firstName lastName email')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Report.countDocuments({ status: 'Pending Review' });

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending reports', error: error.message });
  }
});

// GET /api/reports/:id - Get report by ID
router.get('/:id', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patientId', 'firstName lastName email dateOfBirth')
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName');
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user can access this report
    if (req.user.role === 'patient' && report.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report', error: error.message });
  }
});

// POST /api/reports - Create new report
router.post('/', protect, restrictTo('superadmin', 'receptionist'), reportValidations.create, async (req, res) => {
  try {
    // Check if patient exists
    const patient = await User.findOne({ _id: req.body.patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if appointment exists
    const appointment = await Appointment.findById(req.body.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const reportData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'Draft' // All new reports start as draft
    };

    const report = new Report(reportData);
    await report.save();
    
    // Populate the created report
    await report.populate('patientId', 'firstName lastName email');
    await report.populate('appointmentId', 'appointmentDate reason type');
    await report.populate('createdBy', 'firstName lastName');
    
    // Log report creation
    logHelpers.logCreate('report', report._id, req.user._id, req.user.email, req.body);
    
    res.status(201).json(report);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_creation',
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error creating report', error: error.message });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', protect, restrictTo('superadmin', 'receptionist'), reportValidations.update, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only creator or superadmin can update
    if (report.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can't update approved reports
    if (report.status === 'Approved') {
      return res.status(400).json({ message: 'Cannot update approved reports' });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email')
     .populate('appointmentId', 'appointmentDate reason type')
     .populate('createdBy', 'firstName lastName')
     .populate('reviewedBy', 'firstName lastName');

    // Log report update
    logHelpers.logUpdate('report', report._id, req.user._id, req.user.email, req.body);

    res.json(updatedReport);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_update',
      reportId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating report', error: error.message });
  }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', protect, restrictTo('superadmin'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Log report deletion
    logHelpers.logDelete('report', report._id, req.user._id, req.user.email);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_deletion',
      reportId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error deleting report', error: error.message });
  }
});

// PATCH /api/reports/:id/status - Update report status
router.patch('/:id/status', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Draft', 'Pending Review', 'Approved', 'Rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only creator or superadmin can change status
    if (report.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = { status };
    if (status === 'Approved' || status === 'Rejected') {
      updateData.reviewedBy = req.user.id;
      updateData.reviewedAt = new Date();
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName email')
     .populate('appointmentId', 'appointmentDate reason type')
     .populate('createdBy', 'firstName lastName')
     .populate('reviewedBy', 'firstName lastName');

    // Log status update
    logHelpers.logUpdate('report', report._id, req.user._id, req.user.email, { status });

    res.json(updatedReport);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_status_update',
      reportId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error updating report status', error: error.message });
  }
});

// GET /api/reports/patient/:patientId - Get all reports for a specific patient
router.get('/patient/:patientId', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('patientId'), async (req, res) => {
  try {
    const { reportType, status } = req.query;
    const query = { patientId: req.params.patientId };

    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient reports', error: error.message });
  }
});

// GET /api/reports/patient/me - Get own reports (patients only)
router.get('/patient/me', protect, restrictTo('patient'), async (req, res) => {
  try {
    const { reportType, status } = req.query;
    const query = { patientId: req.user.id };

    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('appointmentId', 'appointmentDate reason type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// POST /api/reports/:id/attachments - Add attachment to report
router.post('/:id/attachments', protect, restrictTo('superadmin', 'receptionist'), commonValidations.mongoId('id'), async (req, res) => {
  try {
    const { fileName, filePath, fileType } = req.body;
    
    if (!fileName || !filePath || !fileType) {
      return res.status(400).json({ message: 'File information is required' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only creator or superadmin can add attachments
    if (report.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          attachments: {
            fileName,
            filePath,
            fileType,
            uploadedAt: new Date(),
            uploadedBy: req.user.id
          }
        }
      },
      { new: true, runValidators: true }
    );

    // Log attachment addition
    logHelpers.logUpdate('report', report._id, req.user._id, req.user.email, { attachmentAdded: fileName });

    res.json(updatedReport);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_attachment',
      reportId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error adding attachment', error: error.message });
  }
});

// GET /api/reports/:id/download - Download report PDF
router.get('/:id/download', protect, commonValidations.mongoId('id'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user can access this report
    if (req.user.role === 'patient' && report.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only approved reports can be downloaded
    if (report.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved reports can be downloaded' });
    }

    // TODO: Implement PDF generation and download
    // For now, return success message
    res.json({ 
      message: 'Report download initiated',
      reportId: report._id,
      fileName: `${report.title}_${report._id}.pdf`
    });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'report_download',
      reportId: req.params.id,
      userId: req.user._id,
      email: req.user.email
    });
    res.status(500).json({ message: 'Error downloading report', error: error.message });
  }
});

module.exports = router;
