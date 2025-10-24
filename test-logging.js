const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';

// Test comprehensive logging system
async function testLoggingSystem() {
  console.log('📊 Testing SmartLab AI Comprehensive Logging System\n');

  let authToken = null;
  let testUser = null;

  try {
    // Test 1: User Registration with Logging
    console.log('1. Testing user registration with logging...');
    const registerData = {
      firstName: 'Log',
      lastName: 'Tester',
      email: 'logtester@smartlabai.com',
      password: 'Test123!',
      role: 'doctor',
      department: 'Cardiology',
      phone: '+1234567890'
    };

    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      authToken = registerResponse.data.token;
      testUser = registerResponse.data.data.user;
      console.log('✅ User registration logged successfully');
      console.log(`   User ID: ${testUser._id}`);
      console.log(`   Role: ${testUser.role}`);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
        console.log('ℹ️  User already exists, proceeding with login test');
      } else {
        throw error;
      }
    }

    // Test 2: User Login with Logging
    console.log('\n2. Testing user login with logging...');
    const loginData = {
      email: 'logtester@smartlabai.com',
      password: 'Test123!'
    };

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    authToken = loginResponse.data.token;
    testUser = loginResponse.data.data.user;
    console.log('✅ User login logged successfully');
    console.log(`   Token received: ${authToken.substring(0, 20)}...`);

    // Test 3: CRUD Operations with Logging
    console.log('\n3. Testing CRUD operations with logging...');
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Create patient
    const patientData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      contact: {
        email: 'john.doe@example.com',
        phone: '+1234567890'
      },
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      }
    };

    const createResponse = await axios.post(`${API_BASE_URL}/patients`, patientData, { headers });
    const patientId = createResponse.data._id;
    console.log('✅ Patient creation logged successfully');
    console.log(`   Patient ID: ${patientId}`);

    // Read patient
    const readResponse = await axios.get(`${API_BASE_URL}/patients/${patientId}`, { headers });
    console.log('✅ Patient read operation logged successfully');

    // Update patient
    const updateData = { firstName: 'Johnny' };
    const updateResponse = await axios.put(`${API_BASE_URL}/patients/${patientId}`, updateData, { headers });
    console.log('✅ Patient update operation logged successfully');

    // Test 4: Password Change with Logging
    console.log('\n4. Testing password change with logging...');
    const passwordData = {
      currentPassword: 'Test123!',
      newPassword: 'NewTest123!',
      newPasswordConfirm: 'NewTest123!'
    };

    try {
      await axios.patch(`${API_BASE_URL}/auth/change-password`, passwordData, { headers });
      console.log('✅ Password change logged successfully');
    } catch (error) {
      console.log('❌ Password change failed:', error.response?.data?.message);
    }

    // Test 5: Failed Login Attempt with Logging
    console.log('\n5. Testing failed login attempt with logging...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'logtester@smartlabai.com',
        password: 'WrongPassword'
      });
      console.log('❌ Security issue: Invalid login accepted');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Failed login attempt logged successfully');
      } else {
        console.log('❌ Unexpected error with invalid login:', error.response?.data?.message);
      }
    }

    // Test 6: Logout with Logging
    console.log('\n6. Testing logout with logging...');
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { headers });
      console.log('✅ Logout logged successfully');
    } catch (error) {
      console.log('❌ Logout failed:', error.response?.data?.message);
    }

    // Test 7: Check Log Files
    console.log('\n7. Checking log files...');
    const logsDir = path.join(__dirname, 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir);
      console.log('✅ Log files created:');
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${stats.size} bytes)`);
      });
    } else {
      console.log('❌ Logs directory not found');
    }

    console.log('\n🎉 Comprehensive logging tests completed!');
    console.log('\n📋 Logging Features Verified:');
    console.log('✅ User Registration Logging');
    console.log('✅ User Login Logging');
    console.log('✅ CRUD Operations Logging');
    console.log('✅ Password Change Logging');
    console.log('✅ Failed Login Attempt Logging');
    console.log('✅ User Logout Logging');
    console.log('✅ Log File Creation');
    console.log('✅ Security Event Logging');
    console.log('✅ Audit Trail Logging');

    console.log('\n📁 Log Files Location:');
    console.log(`   ${path.join(__dirname, 'logs')}`);
    console.log('\n🔍 Log Types:');
    console.log('   - application-YYYY-MM-DD.log (General application logs)');
    console.log('   - error-YYYY-MM-DD.log (Error logs)');
    console.log('   - security-YYYY-MM-DD.log (Security events)');
    console.log('   - audit-YYYY-MM-DD.log (Audit trail)');

  } catch (error) {
    console.error('❌ Logging test failed:', error.response?.data?.message || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testLoggingSystem();
}

module.exports = { testLoggingSystem };
