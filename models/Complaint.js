const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['General', 'Service Quality', 'Billing', 'Appointment', 'Staff Behavior', 'Facility', 'Test Results', 'Privacy', 'Other'],
    default: 'General'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String,
  resolutionNotes: String,
  contactMethod: {
    type: String,
    enum: ['Email', 'Phone', 'In Person', 'Mail'],
    default: 'Email'
  },
  preferredContactTime: String,
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    comment: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // AI Integration fields
  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative']
    },
    urgencyScore: {
      type: Number,
      min: 0,
      max: 10
    },
    categorySuggestion: String,
    resolutionSuggestion: String,
    analyzedAt: Date
  },
  // Tracking fields
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  escalationHistory: [{
    escalatedAt: Date,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    level: Number
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
complaintSchema.index({ patientId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ category: 1 });

// Virtual for complaint age in days
complaintSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for time since last activity
complaintSchema.virtual('timeSinceLastActivity').get(function() {
  return Math.floor((Date.now() - this.lastActivityAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update lastActivityAt
complaintSchema.pre('save', function(next) {
  this.lastActivityAt = new Date();
  next();
});

// Instance method to add a comment
complaintSchema.methods.addComment = function(comment, authorId) {
  this.comments.push({
    comment,
    author: authorId,
    createdAt: new Date()
  });
  this.lastActivityAt = new Date();
  return this.save();
};

// Instance method to escalate complaint
complaintSchema.methods.escalate = function(escalatedBy, reason) {
  this.escalationLevel = Math.min(this.escalationLevel + 1, 3);
  this.escalationHistory.push({
    escalatedAt: new Date(),
    escalatedBy,
    reason,
    level: this.escalationLevel
  });
  this.lastActivityAt = new Date();
  return this.save();
};

// Instance method to update AI analysis
complaintSchema.methods.updateAIAnalysis = function(analysis) {
  this.aiAnalysis = {
    ...analysis,
    analyzedAt: new Date()
  };
  return this.save();
};

// Static method to get complaint statistics
complaintSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
        lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } },
        mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
        highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
        urgentPriority: { $sum: { $cond: [{ $eq: ['$priority', 'Urgent'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    lowPriority: 0,
    mediumPriority: 0,
    highPriority: 0,
    urgentPriority: 0
  };
};

// Static method to get complaints by status
complaintSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'firstName lastName email phone');
};

// Static method to get complaints by priority
complaintSchema.statics.getByPriority = function(priority) {
  return this.find({ priority }).populate('patientId', 'firstName lastName email phone');
};

// Static method to get overdue complaints (older than 7 days and still open)
complaintSchema.statics.getOverdue = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.find({
    status: { $in: ['Open', 'Assigned'] },
    createdAt: { $lt: sevenDaysAgo }
  }).populate('patientId', 'firstName lastName email phone');
};

module.exports = mongoose.model('Complaint', complaintSchema);
