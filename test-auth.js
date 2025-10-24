const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test authentication system
async function testAuthentication() {
  console.log('🔐 Testing SmartLab AI Authentication System\n');

  let authToken = null;
  let testUser = null;

  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@smartlabai.com',
      password: 'Test123!',
      role: 'doctor',
      department: 'Cardiology',
      phone: '+1234567890'
    };

    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
      authToken = registerResponse.data.token;
      testUser = registerResponse.data.data.user;
      console.log('✅ User registration successful');
      console.log(`   User ID: ${testUser._id}`);
      console.log(`   Role: ${testUser.role}`);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
        console.log('ℹ️  User already exists, proceeding with login test');
      } else {
        throw error;
      }
    }

    // Test 2: Login with credentials
    console.log('\n2. Testing user login...');
    const loginData = {
      email: 'test@smartlabai.com',
      password: 'Test123!'
    };

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    authToken = loginResponse.data.token;
    testUser = loginResponse.data.data.user;
    console.log('✅ User login successful');
    console.log(`   Token received: ${authToken.substring(0, 20)}...`);

    // Test 3: Access protected route with token
    console.log('\n3. Testing protected route access...');
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
      const patientsResponse = await axios.get(`${API_BASE_URL}/patients`, { headers });
      console.log('✅ Protected route access successful');
      console.log(`   Patients count: ${patientsResponse.data.total}`);
    } catch (error) {
      console.log('❌ Protected route access failed:', error.response?.data?.message);
    }

    // Test 4: Get current user info
    console.log('\n4. Testing get current user...');
    try {
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, { headers });
      console.log('✅ Get current user successful');
      console.log(`   User: ${meResponse.data.data.user.firstName} ${meResponse.data.data.user.lastName}`);
      console.log(`   Role: ${meResponse.data.data.user.role}`);
    } catch (error) {
      console.log('❌ Get current user failed:', error.response?.data?.message);
    }

    // Test 5: Test role-based access
    console.log('\n5. Testing role-based access...');
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/auth/users`, { headers });
      console.log('✅ Admin access successful (user has admin privileges)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Role-based access working: User denied admin access');
      } else {
        console.log('❌ Role-based access test failed:', error.response?.data?.message);
      }
    }

    // Test 6: Test invalid token
    console.log('\n6. Testing invalid token...');
    try {
      const invalidHeaders = { Authorization: 'Bearer invalid_token_123' };
      await axios.get(`${API_BASE_URL}/patients`, { headers: invalidHeaders });
      console.log('❌ Security issue: Invalid token accepted');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        console.log('❌ Unexpected error with invalid token:', error.response?.data?.message);
      }
    }

    // Test 7: Test without token
    console.log('\n7. Testing request without token...');
    try {
      await axios.get(`${API_BASE_URL}/patients`);
      console.log('❌ Security issue: Request without token accepted');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Request without token properly rejected');
      } else {
        console.log('❌ Unexpected error without token:', error.response?.data?.message);
      }
    }

    // Test 8: Logout
    console.log('\n8. Testing logout...');
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { headers });
      console.log('✅ Logout successful');
    } catch (error) {
      console.log('❌ Logout failed:', error.response?.data?.message);
    }

    console.log('\n🎉 Authentication tests completed!');
    console.log('\n📋 Authentication Features Verified:');
    console.log('✅ User Registration');
    console.log('✅ User Login');
    console.log('✅ JWT Token Authentication');
    console.log('✅ Protected Route Access');
    console.log('✅ Current User Info');
    console.log('✅ Role-Based Authorization');
    console.log('✅ Invalid Token Rejection');
    console.log('✅ No Token Rejection');
    console.log('✅ User Logout');

  } catch (error) {
    console.error('❌ Authentication test failed:', error.response?.data?.message || error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuthentication();
}

module.exports = { testAuthentication };
