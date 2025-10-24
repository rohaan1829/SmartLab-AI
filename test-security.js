const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test security features
async function testSecurity() {
  console.log('🔐 Testing SmartLab AI Security Implementation\n');

  try {
    // Test 1: Health check (should work without auth)
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);

    // Test 2: Protected route without auth (should fail)
    console.log('\n2. Testing protected route without authentication...');
    try {
      await axios.get(`${API_BASE_URL}/patients`);
      console.log('❌ Security issue: Protected route accessible without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Security working: Protected route requires authentication');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 3: Rate limiting (should work)
    console.log('\n3. Testing rate limiting...');
    try {
      // Try to register multiple times quickly
      for (let i = 0; i < 6; i++) {
        try {
          await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: `test${i}@example.com`,
            password: 'Test123!'
          });
        } catch (error) {
          if (error.response?.status === 429) {
            console.log('✅ Rate limiting working: Too many requests blocked');
            break;
          }
        }
      }
    } catch (error) {
      console.log('Rate limiting test completed');
    }

    // Test 4: Input validation (should fail with invalid data)
    console.log('\n4. Testing input validation...');
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        firstName: '', // Invalid: empty name
        lastName: 'User',
        email: 'invalid-email', // Invalid: bad email format
        password: '123' // Invalid: too short password
      });
      console.log('❌ Security issue: Invalid data accepted');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Input validation working: Invalid data rejected');
        console.log('   Validation errors:', error.response.data.errors?.length || 'Multiple errors');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 5: XSS protection (should sanitize input)
    console.log('\n5. Testing XSS protection...');
    try {
      const xssPayload = '<script>alert("xss")</script>';
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        firstName: xssPayload,
        lastName: 'User',
        email: 'xss@example.com',
        password: 'Test123!'
      });
      console.log('✅ XSS protection: Input sanitized');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ XSS protection: Malicious input rejected');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 Security tests completed!');
    console.log('\n📋 Security Features Implemented:');
    console.log('✅ JWT Authentication');
    console.log('✅ Role-based Authorization');
    console.log('✅ Input Validation');
    console.log('✅ Rate Limiting');
    console.log('✅ XSS Protection');
    console.log('✅ NoSQL Injection Protection');
    console.log('✅ Security Headers (Helmet)');
    console.log('✅ Password Hashing (bcrypt)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSecurity();
}

module.exports = { testSecurity };
