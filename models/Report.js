const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportType: {
    type: String,
    enum: ['Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG', 'Pathology', 'General'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  findings: [{
    testName: String,
    result: String,
    normalRange: String,
    status: {
      type: String,
      enum: ['Normal', 'Abnormal', 'Critical', 'Pending']
    },
    unit: String
  }],
  diagnosis: String,
  recommendations: [String],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Pending Review', 'Approved', 'Rejected', 'Published'],
    default: 'Draft'
  },
  reviewedAt: Date,
  reviewNotes: String,
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  isConfidential: {
    type: Boolean,
    default: false
  },
  // AI Integration fields
  aiAnalysis: {
    findingsAnalysis: String,
    riskAssessment: String,
    recommendations: [String],
    analyzedAt: Date
  },
  // Additional fields for enhanced functionality
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  findings: [{
    testName: String,
    result: String,
    unit: String,
    normalRange: String,
    status: {
      type: String,
      enum: ['Normal', 'Abnormal', 'Critical', 'Pending']
    }
  }],
  diagnosis: String,
  recommendations: [String]
}, {
  timestamps: true
});

// Index for better query performance
reportSchema.index({ patientId: 1, createdAt: -1 });
reportSchema.index({ appointmentId: 1 });
reportSchema.index({ createdBy: 1, createdAt: -1 });
reportSchema.index({ reviewedBy: 1, reviewedAt: -1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
