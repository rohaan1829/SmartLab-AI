const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createSendToken } = require('../utils/auth');
const { protect, restrictTo, authLimiter } = require('../middleware/auth');
const { userValidations } = require('../middleware/validation');
const { logHelpers } = require('../utils/logger');

// Register new user (patients can self-register, staff must be created by superadmin)
router.post('/register', authLimiter, userValidations.register, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, phone, employeeId, dateOfBirth, gender } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logHelpers.logSecurityEvent('REGISTRATION_ATTEMPT_DUPLICATE_EMAIL', {
        email,
        ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Default role is patient for self-registration
    const userRole = role || 'patient';

    // Create user data object
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: userRole,
      phone,
      dateOfBirth,
      gender
    };

    // Add role-specific fields
    if (['superadmin', 'receptionist'].includes(userRole)) {
      userData.department = department;
      userData.employeeId = employeeId;
    }

    // Create new user
    const user = await User.create(userData);

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Log successful registration
    logHelpers.logUserRegistration(user._id, email, userRole, ip);

    // TODO: Send verification email
    console.log(`Email verification token for ${email}: ${verificationToken}`);

    createSendToken(user, 201, res);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'user_registration',
      email: req.body.email,
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: error.message
    });
  }
});

// Login user
router.post('/login', authLimiter, userValidations.login, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      logHelpers.logLoginFailure(email, ip, 'Invalid credentials', userAgent);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logHelpers.logLoginFailure(email, ip, 'Account deactivated', userAgent);
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Log successful login
    logHelpers.logUserLogin(user._id, email, ip, userAgent);

    createSendToken(user, 200, res);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'user_login',
      email: req.body.email,
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({
      status: 'error',
      message: 'Error during login',
      error: error.message
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Log logout if user is authenticated
  if (req.user) {
    logHelpers.logUserLogout(req.user._id, req.user.email, ip);
  }
  
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

// Update user profile
router.patch('/update-profile', protect, userValidations.updateProfile, async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'email', 'phone'];
    const updateData = {};
    
    // Add role-specific fields
    if (req.user.role === 'patient') {
      allowedFields.push('dateOfBirth', 'gender', 'address', 'emergencyContact', 'medicalHistory', 'allergies', 'medications', 'insuranceInfo');
    } else if (['superadmin', 'receptionist'].includes(req.user.role)) {
      allowedFields.push('department', 'employeeId');
    }
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Error updating profile',
        error: error.message
      });
    }
  }
});

// Change password
router.patch('/change-password', protect, userValidations.changePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    if (!(await user.correctPassword(currentPassword, user.password))) {
      logHelpers.logSecurityEvent('PASSWORD_CHANGE_FAILED', {
        userId: req.user.id,
        email: req.user.email,
        ip,
        reason: 'Invalid current password'
      });
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log successful password change
    logHelpers.logPasswordChange(user._id, user.email, ip);

    createSendToken(user, 200, res);
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'password_change',
      userId: req.user.id,
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({
      status: 'error',
      message: 'Error changing password',
      error: error.message
    });
  }
});

// Get all users (superadmin only)
router.get('/users', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Update user status (superadmin only)
router.patch('/users/:id/status', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating user status',
      error: error.message
    });
  }
});

// Delete user (superadmin only)
router.delete('/users/:id', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Create new user (superadmin only)
router.post('/users', protect, restrictTo('superadmin'), userValidations.register, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, phone, employeeId, dateOfBirth, gender } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Create user data object
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role,
      phone
    };

    // Add role-specific fields
    if (role === 'patient') {
      userData.dateOfBirth = dateOfBirth;
      userData.gender = gender;
    } else if (['superadmin', 'receptionist'].includes(role)) {
      userData.department = department;
      userData.employeeId = employeeId;
    }

    // Create new user
    const user = await User.create(userData);

    // Log user creation
    logHelpers.logUserRegistration(user._id, email, role, ip);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logHelpers.logError(error, { 
      context: 'user_creation',
      email: req.body.email,
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: error.message
    });
  }
});

module.exports = router;
