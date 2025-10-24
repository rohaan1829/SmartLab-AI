const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance', 'Check', 'Online Payment'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Paid'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  items: [{
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: Number,
    totalPrice: Number
  }],
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    coverageAmount: Number,
    patientResponsibility: Number
  },
  paymentDetails: {
    transactionId: String,
    gatewayResponse: String,
    processorFee: Number,
    netAmount: Number
  },
  refundInfo: {
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    refundMethod: String
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate invoice number
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Index for better query performance
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ appointmentId: 1 });
paymentSchema.index({ invoiceNumber: 1 });
paymentSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
