const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Removed doctorId - replaced with receptionistId for approval
  receptionistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be assigned when appointment is approved
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  type: {
    type: String,
    enum: ['Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'No Show'],
    default: 'Pending'
  },
  // AI Bot Integration Fields
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiSuggestion: {
    type: String,
    maxlength: [1000, 'AI suggestion cannot exceed 1000 characters']
  },
  // Approval workflow
  approvalNotes: {
    type: String,
    maxlength: [500, 'Approval notes cannot exceed 500 characters']
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  // Home sample collection
  homeCollection: {
    requested: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    collectionAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    collectionDate: Date,
    collectionTime: String,
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Test results and reports
  testResults: [{
    testName: String,
    result: String,
    normalRange: String,
    status: {
      type: String,
      enum: ['Normal', 'Abnormal', 'Critical'],
      default: 'Normal'
    },
    notes: String
  }],
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partial', 'Refunded'],
    default: 'Pending'
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  paidAmount: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for appointment status display
appointmentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'Pending': 'Awaiting Approval',
    'Approved': 'Confirmed',
    'Rejected': 'Rejected',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
    'No Show': 'No Show'
  };
  return statusMap[this.status] || this.status;
});

// Indexes for better performance
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ receptionistId: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'homeCollection.requested': 1 });

// Ensure virtual fields are serialized
appointmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
