#!/usr/bin/env node

/**
 * SmartLab AI - Superuser Creation Script
 * 
 * This script creates a superuser account with full administrative permissions.
 * It can be run independently to bootstrap the system with an admin account.
 * 
 * Usage:
 *   node create-superuser.js
 *   node create-superuser.js --email admin@smartlab.com --password Admin123!
 *   node create-superuser.js --interactive
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const crypto = require('crypto');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://roaandev_db_user:Rmug1829@corexcluster.k3jw29a.mongodb.net/';

// Default superuser credentials
const DEFAULT_CREDENTIALS = {
  firstName: 'Super',
  lastName: 'Admin',
  email: 'admin@smartlab.com',
  password: 'SuperAdmin123!',
  phone: '+1234567890',
  department: 'Administration',
  employeeId: 'SUPER001'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to colorize console output
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Helper function to generate secure password
function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to validate email
function validateEmail(email) {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
}

// Helper function to validate password strength
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const issues = [];
  if (password.length < minLength) issues.push(`at least ${minLength} characters`);
  if (!hasUpperCase) issues.push('uppercase letter');
  if (!hasLowerCase) issues.push('lowercase letter');
  if (!hasNumbers) issues.push('number');
  if (!hasSpecialChar) issues.push('special character');
  
  return {
    isValid: issues.length === 0,
    issues: issues
  };
}

// Helper function to validate phone number
function validatePhone(phone) {
  const phoneRegex = /^[\+]?[0-9][\d]{7,15}$/;
  return phoneRegex.test(phone);
}

// Create readline interface for interactive input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Helper function to prompt for input
function promptInput(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Interactive mode to collect user input
async function collectUserInput() {
  const rl = createReadlineInterface();
  
  console.log(colorize('\n🔐 SmartLab AI - Superuser Creation (Interactive Mode)', 'cyan'));
  console.log(colorize('=' .repeat(60), 'cyan'));
  
  try {
    const firstName = await promptInput(rl, colorize('\n📝 First Name: ', 'yellow'));
    const lastName = await promptInput(rl, colorize('📝 Last Name: ', 'yellow'));
    
    let email;
    do {
      email = await promptInput(rl, colorize('📧 Email: ', 'yellow'));
      if (!validateEmail(email)) {
        console.log(colorize('❌ Invalid email format. Please try again.', 'red'));
      }
    } while (!validateEmail(email));
    
    let password;
    do {
      password = await promptInput(rl, colorize('🔒 Password (min 8 chars, must include uppercase, lowercase, number, special char): ', 'yellow'));
      const validation = validatePassword(password);
      if (!validation.isValid) {
        console.log(colorize(`❌ Password must contain: ${validation.issues.join(', ')}`, 'red'));
      }
    } while (!validatePassword(password).isValid);
    
    let phone;
    do {
      phone = await promptInput(rl, colorize('📞 Phone Number: ', 'yellow'));
      if (!validatePhone(phone)) {
        console.log(colorize('❌ Invalid phone number format. Please try again.', 'red'));
      }
    } while (!validatePhone(phone));
    
    const department = await promptInput(rl, colorize('🏢 Department: ', 'yellow')) || 'Administration';
    const employeeId = await promptInput(rl, colorize('🆔 Employee ID: ', 'yellow')) || `EMP${Date.now()}`;
    
    rl.close();
    
    return {
      firstName: firstName || 'Super',
      lastName: lastName || 'Admin',
      email,
      password,
      phone,
      department,
      employeeId
    };
  } catch (error) {
    rl.close();
    throw error;
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    interactive: false,
    email: null,
    password: null,
    firstName: null,
    lastName: null,
    phone: null,
    department: null,
    employeeId: null,
    generatePassword: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--email':
      case '-e':
        options.email = args[++i];
        break;
      case '--password':
      case '-p':
        options.password = args[++i];
        break;
      case '--first-name':
      case '-f':
        options.firstName = args[++i];
        break;
      case '--last-name':
      case '-l':
        options.lastName = args[++i];
        break;
      case '--phone':
        options.phone = args[++i];
        break;
      case '--department':
      case '-d':
        options.department = args[++i];
        break;
      case '--employee-id':
        options.employeeId = args[++i];
        break;
      case '--generate-password':
      case '-g':
        options.generatePassword = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// Show help information
function showHelp() {
  console.log(colorize('\n🔐 SmartLab AI - Superuser Creation Script', 'cyan'));
  console.log(colorize('=' .repeat(50), 'cyan'));
  console.log('\nUsage:');
  console.log('  node create-superuser.js [options]');
  console.log('\nOptions:');
  console.log('  -i, --interactive          Interactive mode');
  console.log('  -e, --email <email>        Email address');
  console.log('  -p, --password <password>  Password');
  console.log('  -f, --first-name <name>    First name');
  console.log('  -l, --last-name <name>     Last name');
  console.log('  --phone <phone>            Phone number');
  console.log('  -d, --department <dept>    Department');
  console.log('  --employee-id <id>         Employee ID');
  console.log('  -g, --generate-password    Generate secure password');
  console.log('  -h, --help                 Show this help');
  console.log('\nExamples:');
  console.log('  node create-superuser.js --interactive');
  console.log('  node create-superuser.js --email admin@smartlab.com --password Admin123!');
  console.log('  node create-superuser.js --generate-password');
  console.log('\nDefault credentials:');
  console.log(`  Email: ${DEFAULT_CREDENTIALS.email}`);
  console.log(`  Password: ${DEFAULT_CREDENTIALS.password}`);
}

// Main function to create superuser
async function createSuperuser() {
  try {
    console.log(colorize('\n🚀 Starting SmartLab AI Superuser Creation...', 'bright'));
    
    // Parse command line arguments
    const options = parseArguments();
    
    let userData;
    
    if (options.interactive) {
      // Interactive mode
      userData = await collectUserInput();
    } else {
      // Command line mode
      userData = {
        firstName: options.firstName || DEFAULT_CREDENTIALS.firstName,
        lastName: options.lastName || DEFAULT_CREDENTIALS.lastName,
        email: options.email || DEFAULT_CREDENTIALS.email,
        password: options.password || (options.generatePassword ? generateSecurePassword() : DEFAULT_CREDENTIALS.password),
        phone: options.phone || DEFAULT_CREDENTIALS.phone,
        department: options.department || DEFAULT_CREDENTIALS.department,
        employeeId: options.employeeId || DEFAULT_CREDENTIALS.employeeId
      };
    }
    
    // Validate input
    if (!validateEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.issues.join(', ')}`);
    }
    
    if (!validatePhone(userData.phone)) {
      throw new Error('Invalid phone number format');
    }
    
    // Connect to MongoDB
    console.log(colorize('\n📡 Connecting to MongoDB...', 'blue'));
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(colorize('✅ Connected to MongoDB successfully', 'green'));
    
    // Check if superuser already exists
    console.log(colorize('\n🔍 Checking for existing superuser...', 'blue'));
    const existingSuperuser = await User.findOne({ 
      $or: [
        { email: userData.email },
        { role: 'superadmin' }
      ]
    });
    
    if (existingSuperuser) {
      if (existingSuperuser.email === userData.email) {
        console.log(colorize(`⚠️  User with email ${userData.email} already exists`, 'yellow'));
        console.log(colorize('   Role:', 'yellow'), existingSuperuser.role);
        console.log(colorize('   Status:', 'yellow'), existingSuperuser.isActive ? 'Active' : 'Inactive');
        
        const rl = createReadlineInterface();
        const update = await promptInput(rl, colorize('\n🔄 Do you want to update this user to superadmin? (y/N): ', 'yellow'));
        rl.close();
        
        if (update.toLowerCase() === 'y' || update.toLowerCase() === 'yes') {
          // Update existing user to superadmin
          existingSuperuser.role = 'superadmin';
          existingSuperuser.firstName = userData.firstName;
          existingSuperuser.lastName = userData.lastName;
          existingSuperuser.password = userData.password;
          existingSuperuser.phone = userData.phone;
          existingSuperuser.department = userData.department;
          existingSuperuser.employeeId = userData.employeeId;
          existingSuperuser.isActive = true;
          existingSuperuser.isEmailVerified = true;
          
          await existingSuperuser.save();
          console.log(colorize('✅ User updated to superadmin successfully', 'green'));
          displayCredentials(userData);
          return;
        } else {
          console.log(colorize('❌ Operation cancelled', 'red'));
          return;
        }
      } else {
        console.log(colorize('⚠️  A superadmin already exists in the system', 'yellow'));
        console.log(colorize(`   Email: ${existingSuperuser.email}`, 'yellow'));
        
        const rl = createReadlineInterface();
        const proceed = await promptInput(rl, colorize('\n🔄 Do you want to create another superadmin? (y/N): ', 'yellow'));
        rl.close();
        
        if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
          console.log(colorize('❌ Operation cancelled', 'red'));
          return;
        }
      }
    }
    
    // Create new superuser
    console.log(colorize('\n👤 Creating superuser account...', 'blue'));
    
    const superuser = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      role: 'superadmin',
      phone: userData.phone,
      department: userData.department,
      employeeId: userData.employeeId,
      isActive: true,
      isEmailVerified: true,
      status: 'Active'
    });
    
    await superuser.save();
    
    console.log(colorize('✅ Superuser created successfully!', 'green'));
    displayCredentials(userData);
    
    // Log the creation
    console.log(colorize('\n📊 Superuser Details:', 'cyan'));
    console.log(colorize('   ID:', 'yellow'), superuser._id);
    console.log(colorize('   Name:', 'yellow'), `${superuser.firstName} ${superuser.lastName}`);
    console.log(colorize('   Email:', 'yellow'), superuser.email);
    console.log(colorize('   Role:', 'yellow'), superuser.role);
    console.log(colorize('   Department:', 'yellow'), superuser.department);
    console.log(colorize('   Employee ID:', 'yellow'), superuser.employeeId);
    console.log(colorize('   Status:', 'yellow'), superuser.isActive ? 'Active' : 'Inactive');
    console.log(colorize('   Created:', 'yellow'), superuser.createdAt);
    
  } catch (error) {
    console.error(colorize('\n❌ Error creating superuser:', 'red'));
    console.error(colorize(error.message, 'red'));
    
    if (error.code === 11000) {
      console.error(colorize('\n💡 This email is already registered. Use --interactive mode to update existing user.', 'yellow'));
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log(colorize('\n📡 Database connection closed', 'blue'));
    }
  }
}

// Display credentials in a formatted way
function displayCredentials(userData) {
  console.log(colorize('\n🎉 SUPERUSER CREDENTIALS CREATED SUCCESSFULLY!', 'green'));
  console.log(colorize('=' .repeat(50), 'green'));
  console.log(colorize('\n📧 Email:', 'yellow'), userData.email);
  console.log(colorize('🔒 Password:', 'yellow'), userData.password);
  console.log(colorize('👤 Name:', 'yellow'), `${userData.firstName} ${userData.lastName}`);
  console.log(colorize('🏢 Department:', 'yellow'), userData.department);
  console.log(colorize('🆔 Employee ID:', 'yellow'), userData.employeeId);
  console.log(colorize('\n⚠️  IMPORTANT SECURITY NOTES:', 'red'));
  console.log(colorize('   • Change the password immediately after first login', 'yellow'));
  console.log(colorize('   • Store these credentials securely', 'yellow'));
  console.log(colorize('   • Do not share these credentials in plain text', 'yellow'));
  console.log(colorize('   • Enable two-factor authentication if available', 'yellow'));
  console.log(colorize('\n🌐 You can now login at:', 'cyan'));
  console.log(colorize('   Frontend: http://localhost:3000', 'cyan'));
  console.log(colorize('   API: http://localhost:5000/api/auth/login', 'cyan'));
}

// Run the script
if (require.main === module) {
  createSuperuser().catch(console.error);
}

module.exports = { createSuperuser, generateSecurePassword, validateEmail, validatePassword };
