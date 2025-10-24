const axios = require('axios');

/**
 * SmartLab AI Registration Test Script
 * 
 * This script tests user registration for different roles:
 * - Receptionist
 * - Patient  
 * - Superadmin
 * 
 * All users now require dateOfBirth and gender fields.
 */

const BASE_URL = 'http://localhost:5000/api';

// Test data for different roles
const testUsers = {
  receptionist: {
    firstName: 'John',
    lastName: 'Receptionist',
    email: 'john.receptionist@smartlab.com',
    password: 'Password123',
    role: 'receptionist',
    department: 'Reception',
    employeeId: 'REC001',
    phone: '1234567890',
    dateOfBirth: '1990-01-15',
    gender: 'Male'
  },
  
  patient: {
    firstName: 'Jane',
    lastName: 'Patient',
    email: 'jane.patient@smartlab.com',
    password: 'Password123',
    role: 'patient',
    phone: '0987654321',
    dateOfBirth: '1985-05-20',
    gender: 'Female',
    address: '123 Main St, City, State',
    emergencyContact: {
      name: 'John Patient',
      phone: '1111111111',
      relationship: 'Spouse'
    },
    medicalHistory: 'No significant medical history',
    allergies: 'None',
    medications: 'None',
    insuranceInfo: {
      provider: 'Health Insurance Co',
      policyNumber: 'POL123456',
      groupNumber: 'GRP789'
    }
  },
  
  superadmin: {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin.user@smartlab.com',
    password: 'AdminPass123',
    role: 'superadmin',
    department: 'Administration',
    employeeId: 'ADM001',
    phone: '5555555555',
    dateOfBirth: '1980-12-01',
    gender: 'Other'
  }
};

async function testRegistration(userType, userData) {
  console.log(`\n🚀 Testing ${userType.toUpperCase()} Registration...`);
  console.log('📋 Registration Data:', JSON.stringify(userData, null, 2));
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Registration Successful!');
    console.log('📊 Response Status:', response.status);
    console.log('👤 User Created:', {
      name: `${response.data.data.user.firstName} ${response.data.data.user.lastName}`,
      email: response.data.data.user.email,
      role: response.data.data.user.role,
      department: response.data.data.user.department || 'N/A',
      employeeId: response.data.data.user.employeeId || 'N/A'
    });
    
    // Test login
    console.log('\n🔐 Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: userData.email,
      password: userData.password
    });
    
    console.log('✅ Login Successful!');
    console.log('🎫 Token:', loginResponse.data.token ? 'Present' : 'Missing');
    
    return { success: true, user: response.data.data.user };
    
  } catch (error) {
    console.error('❌ Registration Failed!');
    console.error('📊 Status:', error.response?.status);
    console.error('📝 Error Message:', error.response?.data?.message);
    
    if (error.response?.data?.errors) {
      console.error('🔍 Validation Errors:');
      error.response.data.errors.forEach(err => {
        console.error(`   - ${err.field}: ${err.message}`);
      });
    }
    
    return { success: false, error: error.response?.data };
  }
}

async function runAllTests() {
  console.log('🧪 SmartLab AI Registration Test Suite');
  console.log('=====================================');
  
  const results = {};
  
  // Test each user type
  for (const [userType, userData] of Object.entries(testUsers)) {
    results[userType] = await testRegistration(userType, userData);
    
    // Wait 2 seconds between tests to avoid rate limiting
    if (userType !== 'superadmin') {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  
  Object.entries(results).forEach(([userType, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${userType.toUpperCase()}: ${status}`);
  });
  
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🏁 Overall Result: ${successCount}/${totalCount} tests passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All registration tests passed! The system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
}

// Run the tests
runAllTests().catch(console.error);
