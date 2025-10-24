const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../utils/auth');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = await verifyToken(token);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+password');
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'error',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // 5) Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }
};

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if user owns the resource or has admin privileges
const checkOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    if (req.user.id === resourceUserId) {
      return next();
    }
    
    return res.status(403).json({
      status: 'error',
      message: 'You can only access your own resources'
    });
  };
};

// Check if user can manage patients (superadmin or receptionist)
const canManagePatients = (req, res, next) => {
  if (['superadmin', 'receptionist'].includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'You do not have permission to manage patients'
  });
};

// Check if user can approve operations (superadmin or receptionist)
const canApprove = (req, res, next) => {
  if (['superadmin', 'receptionist'].includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'You do not have permission to approve operations'
  });
};

// Check if user is patient
const isPatient = (req, res, next) => {
  if (req.user.role === 'patient') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'This action is only available for patients'
  });
};

// Check if user is staff (superadmin or receptionist)
const isStaff = (req, res, next) => {
  if (['superadmin', 'receptionist'].includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'This action is only available for staff members'
  });
};

// Check if user is logged in (for optional authentication)
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = await verifyToken(token);
      const currentUser = await User.findById(decoded.id);
      
      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};

// Rate limiting for authentication routes
const authLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API routes
const apiLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for patient operations
const patientLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  protect,
  restrictTo,
  checkOwnershipOrAdmin,
  canManagePatients,
  canApprove,
  isPatient,
  isStaff,
  optionalAuth,
  authLimiter,
  apiLimiter,
  patientLimiter
};
