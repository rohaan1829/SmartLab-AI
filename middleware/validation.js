const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Sanitize data against NoSQL query injection
const sanitizeData = mongoSanitize({
  onSanitize: ({ req, key }) => {
    console.warn(`This request[${key}] is sanitized`, req[key]);
  },
});

// Sanitize data against XSS attacks
const sanitizeXSS = xss();

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  mongoId: (field) => param(field).isMongoId().withMessage('Invalid ID format'),
  
  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: (field = 'password') => body(field)
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  phone: (field = 'phone') => body(field)
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  name: (field) => body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} must be between 2 and 50 characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage(`${field} can only contain letters and spaces`),
  
  date: (field) => body(field)
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`),
  
  pagination: () => [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};

// Patient validation rules
const patientValidations = {
  create: [
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    commonValidations.email(),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    commonValidations.date('dateOfBirth'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('status').optional().isIn(['Active', 'Inactive', 'Suspended']).withMessage('Invalid status'),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId('id'),
    commonValidations.name('firstName').optional(),
    commonValidations.name('lastName').optional(),
    commonValidations.email().optional(),
    body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
    commonValidations.date('dateOfBirth').optional(),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('status').optional().isIn(['Active', 'Inactive', 'Suspended']).withMessage('Invalid status'),
    handleValidationErrors
  ]
};

// Appointment validation rules
const appointmentValidations = {
  create: [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    commonValidations.date('appointmentDate'),
    body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format (HH:MM) is required'),
    body('type').isIn(['Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other']).withMessage('Valid appointment type is required'),
    body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
    body('homeCollection.requested').optional().isBoolean(),
    body('homeCollection.collectionAddress.street').optional().trim().isLength({ max: 100 }),
    body('homeCollection.collectionAddress.city').optional().trim().isLength({ max: 50 }),
    body('homeCollection.collectionAddress.state').optional().trim().isLength({ max: 50 }),
    body('homeCollection.collectionAddress.zipCode').optional().trim().isLength({ max: 10 }),
    body('homeCollection.collectionAddress.country').optional().trim().isLength({ max: 50 }),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId('id'),
    body('appointmentDate').optional().isISO8601().withMessage('Valid appointment date is required'),
    body('appointmentTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format (HH:MM) is required'),
    body('type').optional().isIn(['Blood Test', 'Urine Test', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other']).withMessage('Valid appointment type is required'),
    body('reason').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
    body('status').optional().isIn(['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'No Show']).withMessage('Valid status is required'),
    body('approvalNotes').optional().trim().isLength({ max: 500 }).withMessage('Approval notes cannot exceed 500 characters'),
    body('rejectionReason').optional().trim().isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
    handleValidationErrors
  ]
};

// Report validation rules
const reportValidations = {
  create: [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
    body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
    body('reportType').isIn(['Lab Report', 'Radiology Report', 'Pathology Report', 'Diagnostic Report', 'General Report']).withMessage('Invalid report type'),
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
    body('status').optional().isIn(['Draft', 'Pending Review', 'Approved', 'Rejected']).withMessage('Invalid status'),
    body('isConfidential').optional().isBoolean().withMessage('isConfidential must be a boolean'),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId('id'),
    body('patientId').optional().isMongoId().withMessage('Valid patient ID is required'),
    body('appointmentId').optional().isMongoId().withMessage('Valid appointment ID is required'),
    body('doctorId').optional().isMongoId().withMessage('Valid doctor ID is required'),
    body('reportType').optional().isIn(['Lab Report', 'Radiology Report', 'Pathology Report', 'Diagnostic Report', 'General Report']).withMessage('Invalid report type'),
    body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
    body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
    body('status').optional().isIn(['Draft', 'Pending Review', 'Approved', 'Rejected']).withMessage('Invalid status'),
    body('isConfidential').optional().isBoolean().withMessage('isConfidential must be a boolean'),
    handleValidationErrors
  ]
};

// Payment validation rules
const paymentValidations = {
  create: [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('appointmentId').optional().isMongoId().withMessage('Valid appointment ID is required'),
    commonValidations.positiveNumber('amount'),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
    body('paymentMethod').isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance', 'Check', 'Online Payment']).withMessage('Invalid payment method'),
    body('paymentStatus').optional().isIn(['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Paid']).withMessage('Invalid payment status'),
    commonValidations.date('dueDate'),
    body('description').trim().isLength({ min: 5, max: 500 }).withMessage('Description must be between 5 and 500 characters'),
    commonValidations.positiveNumber('totalAmount'),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId('id'),
    body('patientId').optional().isMongoId().withMessage('Valid patient ID is required'),
    body('appointmentId').optional().isMongoId().withMessage('Valid appointment ID is required'),
    commonValidations.positiveNumber('amount').optional(),
    body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).withMessage('Invalid currency'),
    body('paymentMethod').optional().isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance', 'Check', 'Online Payment']).withMessage('Invalid payment method'),
    body('paymentStatus').optional().isIn(['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Paid']).withMessage('Invalid payment status'),
    commonValidations.date('dueDate').optional(),
    body('description').optional().trim().isLength({ min: 5, max: 500 }).withMessage('Description must be between 5 and 500 characters'),
    commonValidations.positiveNumber('totalAmount').optional(),
    handleValidationErrors
  ]
};

// User validation rules
const userValidations = {
  register: [
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    commonValidations.email(),
    commonValidations.password(),
    body('role').optional().isIn(['superadmin', 'receptionist', 'patient']).withMessage('Invalid role'),
    body('department').optional().trim().isLength({ max: 100 }).withMessage('Department name cannot exceed 100 characters'),
    body('employeeId').optional().trim().isLength({ max: 20 }).withMessage('Employee ID cannot exceed 20 characters'),
    commonValidations.phone(),
    // Patient-specific validations
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  updateProfile: [
    commonValidations.name('firstName').optional(),
    commonValidations.name('lastName').optional(),
    commonValidations.email().optional(),
    commonValidations.phone().optional(),
    body('department').optional().trim().isLength({ max: 100 }).withMessage('Department name cannot exceed 100 characters'),
    body('employeeId').optional().trim().isLength({ max: 20 }).withMessage('Employee ID cannot exceed 20 characters'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
    handleValidationErrors
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    commonValidations.password('newPassword'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
    handleValidationErrors
  ]
};

// Complaint validations
const complaintValidations = {
  create: [
    commonValidations.mongoId('patientId'),
    body('subject').trim().notEmpty().withMessage('Subject is required')
      .isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters'),
    body('description').trim().notEmpty().withMessage('Description is required')
      .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
    body('category').optional().isIn(['General', 'Service Quality', 'Billing', 'Appointment', 'Staff Behavior', 'Facility', 'Test Results', 'Privacy', 'Other'])
      .withMessage('Invalid category'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent'])
      .withMessage('Invalid priority'),
    body('contactMethod').optional().isIn(['Email', 'Phone', 'In Person', 'Mail'])
      .withMessage('Invalid contact method'),
    body('preferredContactTime').optional().trim().isLength({ max: 100 })
      .withMessage('Preferred contact time cannot exceed 100 characters'),
    handleValidationErrors
  ],
  
  update: [
    body('subject').optional().trim().isLength({ min: 5, max: 200 })
      .withMessage('Subject must be between 5 and 200 characters'),
    body('description').optional().trim().isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters long'),
    body('category').optional().isIn(['General', 'Service Quality', 'Billing', 'Appointment', 'Staff Behavior', 'Facility', 'Test Results', 'Privacy', 'Other'])
      .withMessage('Invalid category'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent'])
      .withMessage('Invalid priority'),
    body('status').optional().isIn(['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'])
      .withMessage('Invalid status'),
    body('contactMethod').optional().isIn(['Email', 'Phone', 'In Person', 'Mail'])
      .withMessage('Invalid contact method'),
    body('preferredContactTime').optional().trim().isLength({ max: 100 })
      .withMessage('Preferred contact time cannot exceed 100 characters'),
    handleValidationErrors
  ],
  
  assign: [
    commonValidations.mongoId('assignedTo'),
    body('notes').optional().trim().isLength({ max: 500 })
      .withMessage('Assignment notes cannot exceed 500 characters'),
    handleValidationErrors
  ],
  
  resolve: [
    body('resolution').trim().notEmpty().withMessage('Resolution is required')
      .isLength({ min: 10 }).withMessage('Resolution must be at least 10 characters long'),
    body('resolutionNotes').optional().trim().isLength({ max: 1000 })
      .withMessage('Resolution notes cannot exceed 1000 characters'),
    handleValidationErrors
  ],
  
  addComment: [
    body('comment').trim().notEmpty().withMessage('Comment is required')
      .isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
    handleValidationErrors
  ],
  
  updatePriority: [
    body('priority').isIn(['Low', 'Medium', 'High', 'Urgent'])
      .withMessage('Invalid priority level'),
    handleValidationErrors
  ]
};

module.exports = {
  sanitizeData,
  sanitizeXSS,
  handleValidationErrors,
  commonValidations,
  patientValidations,
  appointmentValidations,
  reportValidations,
  paymentValidations,
  userValidations,
  complaintValidations
};
