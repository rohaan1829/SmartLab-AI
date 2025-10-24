const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['superadmin', 'receptionist', 'patient'],
    default: 'patient'
  },
  // Patient-specific fields (only relevant for patient role)
  dateOfBirth: {
    type: Date,
    required: function() { return this.role === 'patient'; }
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: function() { return this.role === 'patient'; }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[0-9][\d]{7,15}$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  medicalHistory: [String],
  allergies: [String],
  medications: [String],
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String
  },
  // Staff-specific fields (only relevant for staff roles)
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters'],
    required: function() { return ['superadmin', 'receptionist'].includes(this.role); }
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: function() { return ['superadmin', 'receptionist'].includes(this.role); }
  },
  // AI Bot Integration Fields
  aiPreferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'friendly'],
      default: 'friendly'
    }
  },
  // Status and Activity
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // AI Bot Interaction History
  aiInteractions: [{
    timestamp: { type: Date, default: Date.now },
    interactionType: {
      type: String,
      enum: ['appointment_booking', 'report_inquiry', 'payment_query', 'complaint', 'general']
    },
    query: String,
    response: String,
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    }
  }]
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age (patients only)
userSchema.virtual('age').get(function() {
  if (this.role === 'patient' && this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ 'aiInteractions.timestamp': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Set passwordChangedAt
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after password change
  next();
});

// Pre-save middleware to update passwordChangedAt
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to create email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Instance method to add AI interaction (for future AI bot integration)
userSchema.methods.addAIInteraction = function(interactionType, query, response, satisfaction = null) {
  this.aiInteractions.push({
    interactionType,
    query,
    response,
    satisfaction
  });
  
  // Keep only last 100 interactions to prevent document from growing too large
  if (this.aiInteractions.length > 100) {
    this.aiInteractions = this.aiInteractions.slice(-100);
  }
  
  return this.save();
};

// Instance method to get user's communication preferences for AI
userSchema.methods.getAICommunicationPrefs = function() {
  return {
    language: this.aiPreferences.language,
    timezone: this.aiPreferences.timezone,
    style: this.aiPreferences.communicationStyle,
    notifications: this.aiPreferences.notifications
  };
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
