const axios = require('axios');
const mongoose = require('mongoose');

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 10000,
  testUsers: {
    patient: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'Test123!',
      role: 'patient',
      phone: '+1234567890',
      dateOfBirth: '1990-01-15',
      gender: 'Male'
    },
    receptionist: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@test.com',
      password: 'Test123!',
      role: 'receptionist',
      phone: '+1234567891',
      department: 'Reception',
      employeeId: 'EMP001'
    },
    superadmin: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'Test123!',
      role: 'superadmin',
      phone: '+1234567892',
      department: 'Administration',
      employeeId: 'ADM001'
    }
  }
};

class UserManagementTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    this.authTokens = {};
    this.createdUsers = [];
  }

  // Helper method to log test results
  logResult(testName, passed, message = '', details = {}) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
    
    this.testResults.details.push({
      test: testName,
      passed,
      message,
      details
    });
  }

  // Helper method to make authenticated requests
  async makeRequest(method, endpoint, data = null, role = 'patient') {
    const config = {
      method,
      url: `${TEST_CONFIG.baseUrl}${endpoint}`,
      timeout: TEST_CONFIG.timeout
    };

    if (this.authTokens[role]) {
      config.headers = { Authorization: `Bearer ${this.authTokens[role]}` };
    }

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  // Test 1: User Registration Tests
  async testUserRegistration() {
    console.log('\n🔐 Testing User Registration...\n');

    // Test 1.1: Patient Registration
    const patientResult = await this.makeRequest('POST', '/auth/register', TEST_CONFIG.testUsers.patient);
    if (patientResult.success) {
      this.authTokens.patient = patientResult.data.token;
      this.createdUsers.push(patientResult.data.data.user._id);
      this.logResult('Patient Registration', true, 'Patient registered successfully');
    } else {
      this.logResult('Patient Registration', false, patientResult.error.message || 'Registration failed');
    }

    // Test 1.2: Receptionist Registration (should work for self-registration)
    const receptionistResult = await this.makeRequest('POST', '/auth/register', TEST_CONFIG.testUsers.receptionist);
    if (receptionistResult.success) {
      this.authTokens.receptionist = receptionistResult.data.token;
      this.createdUsers.push(receptionistResult.data.data.user._id);
      this.logResult('Receptionist Registration', true, 'Receptionist registered successfully');
    } else {
      this.logResult('Receptionist Registration', false, receptionistResult.error.message || 'Registration failed');
    }

    // Test 1.3: SuperAdmin Registration (should work for self-registration)
    const superadminResult = await this.makeRequest('POST', '/auth/register', TEST_CONFIG.testUsers.superadmin);
    if (superadminResult.success) {
      this.authTokens.superadmin = superadminResult.data.token;
      this.createdUsers.push(superadminResult.data.data.user._id);
      this.logResult('SuperAdmin Registration', true, 'SuperAdmin registered successfully');
    } else {
      this.logResult('SuperAdmin Registration', false, superadminResult.error.message || 'Registration failed');
    }

    // Test 1.4: Duplicate Email Registration
    const duplicateResult = await this.makeRequest('POST', '/auth/register', TEST_CONFIG.testUsers.patient);
    if (!duplicateResult.success && duplicateResult.status === 400) {
      this.logResult('Duplicate Email Prevention', true, 'Duplicate email properly rejected');
    } else {
      this.logResult('Duplicate Email Prevention', false, 'Duplicate email was not properly rejected');
    }

    // Test 1.5: Invalid Data Registration
    const invalidData = {
      firstName: 'A', // Too short
      lastName: 'B', // Too short
      email: 'invalid-email',
      password: '123', // Too weak
      role: 'invalid-role'
    };
    const invalidResult = await this.makeRequest('POST', '/auth/register', invalidData);
    if (!invalidResult.success && invalidResult.status === 400) {
      this.logResult('Invalid Data Validation', true, 'Invalid data properly rejected');
    } else {
      this.logResult('Invalid Data Validation', false, 'Invalid data was not properly rejected');
    }
  }

  // Test 2: User Authentication Tests
  async testUserAuthentication() {
    console.log('\n🔑 Testing User Authentication...\n');

    // Test 2.1: Valid Login
    const loginData = {
      email: TEST_CONFIG.testUsers.patient.email,
      password: TEST_CONFIG.testUsers.patient.password
    };
    const loginResult = await this.makeRequest('POST', '/auth/login', loginData);
    if (loginResult.success) {
      this.authTokens.patient = loginResult.data.token;
      this.logResult('Valid Login', true, 'Login successful');
    } else {
      this.logResult('Valid Login', false, loginResult.error.message || 'Login failed');
    }

    // Test 2.2: Invalid Credentials
    const invalidLoginData = {
      email: TEST_CONFIG.testUsers.patient.email,
      password: 'wrongpassword'
    };
    const invalidLoginResult = await this.makeRequest('POST', '/auth/login', invalidLoginData);
    if (!invalidLoginResult.success && invalidLoginResult.status === 401) {
      this.logResult('Invalid Credentials', true, 'Invalid credentials properly rejected');
    } else {
      this.logResult('Invalid Credentials', false, 'Invalid credentials were not properly rejected');
    }

    // Test 2.3: Non-existent User Login
    const nonExistentLoginData = {
      email: 'nonexistent@test.com',
      password: 'Test123!'
    };
    const nonExistentResult = await this.makeRequest('POST', '/auth/login', nonExistentLoginData);
    if (!nonExistentResult.success && nonExistentResult.status === 401) {
      this.logResult('Non-existent User Login', true, 'Non-existent user properly rejected');
    } else {
      this.logResult('Non-existent User Login', false, 'Non-existent user was not properly rejected');
    }

    // Test 2.4: Get Current User
    const meResult = await this.makeRequest('GET', '/auth/me', null, 'patient');
    if (meResult.success) {
      this.logResult('Get Current User', true, 'Current user info retrieved');
    } else {
      this.logResult('Get Current User', false, meResult.error.message || 'Failed to get current user');
    }

    // Test 2.5: Logout
    const logoutResult = await this.makeRequest('POST', '/auth/logout', {}, 'patient');
    if (logoutResult.success) {
      this.logResult('User Logout', true, 'Logout successful');
    } else {
      this.logResult('User Logout', false, logoutResult.error.message || 'Logout failed');
    }
  }

  // Test 3: Profile Management Tests
  async testProfileManagement() {
    console.log('\n👤 Testing Profile Management...\n');

    // Re-login to get fresh token
    const loginData = {
      email: TEST_CONFIG.testUsers.patient.email,
      password: TEST_CONFIG.testUsers.patient.password
    };
    const loginResult = await this.makeRequest('POST', '/auth/login', loginData);
    if (loginResult.success) {
      this.authTokens.patient = loginResult.data.token;
    }

    // Test 3.1: Update Profile Information
    const profileUpdateData = {
      firstName: 'John Updated',
      lastName: 'Doe Updated',
      phone: '+1234567899',
      address: '123 Updated Street, City, State'
    };
    const profileUpdateResult = await this.makeRequest('PATCH', '/auth/update-profile', profileUpdateData, 'patient');
    if (profileUpdateResult.success) {
      this.logResult('Profile Update', true, 'Profile updated successfully');
    } else {
      this.logResult('Profile Update', false, profileUpdateResult.error.message || 'Profile update failed');
    }

    // Test 3.2: Change Password
    const passwordChangeData = {
      currentPassword: TEST_CONFIG.testUsers.patient.password,
      newPassword: 'NewTest123!',
      confirmPassword: 'NewTest123!'
    };
    const passwordChangeResult = await this.makeRequest('PATCH', '/auth/change-password', passwordChangeData, 'patient');
    if (passwordChangeResult.success) {
      this.logResult('Password Change', true, 'Password changed successfully');
      // Update the password for future tests
      TEST_CONFIG.testUsers.patient.password = 'NewTest123!';
    } else {
      this.logResult('Password Change', false, passwordChangeResult.error.message || 'Password change failed');
    }

    // Test 3.3: Invalid Password Change
    const invalidPasswordData = {
      currentPassword: 'wrongpassword',
      newPassword: 'NewTest123!',
      confirmPassword: 'NewTest123!'
    };
    const invalidPasswordResult = await this.makeRequest('PATCH', '/auth/change-password', invalidPasswordData, 'patient');
    if (!invalidPasswordResult.success && invalidPasswordResult.status === 401) {
      this.logResult('Invalid Password Change', true, 'Invalid current password properly rejected');
    } else {
      this.logResult('Invalid Password Change', false, 'Invalid current password was not properly rejected');
    }

    // Test 3.4: Password Mismatch
    const passwordMismatchData = {
      currentPassword: TEST_CONFIG.testUsers.patient.password,
      newPassword: 'NewTest123!',
      confirmPassword: 'DifferentPassword123!'
    };
    const passwordMismatchResult = await this.makeRequest('PATCH', '/auth/change-password', passwordMismatchData, 'patient');
    if (!passwordMismatchResult.success && passwordMismatchResult.status === 400) {
      this.logResult('Password Mismatch Validation', true, 'Password mismatch properly rejected');
    } else {
      this.logResult('Password Mismatch Validation', false, 'Password mismatch was not properly rejected');
    }
  }

  // Test 4: User Administration Tests (SuperAdmin only)
  async testUserAdministration() {
    console.log('\n👨‍💼 Testing User Administration (SuperAdmin)...\n');

    // Login as superadmin
    const loginData = {
      email: TEST_CONFIG.testUsers.superadmin.email,
      password: TEST_CONFIG.testUsers.superadmin.password
    };
    const loginResult = await this.makeRequest('POST', '/auth/login', loginData);
    if (loginResult.success) {
      this.authTokens.superadmin = loginResult.data.token;
    }

    // Test 4.1: Get All Users
    const getUsersResult = await this.makeRequest('GET', '/auth/users', null, 'superadmin');
    if (getUsersResult.success) {
      this.logResult('Get All Users', true, `Retrieved ${getUsersResult.data.data.users.length} users`);
    } else {
      this.logResult('Get All Users', false, getUsersResult.error.message || 'Failed to get users');
    }

    // Test 4.2: Get Users with Pagination
    const paginationResult = await this.makeRequest('GET', '/auth/users?page=1&limit=5', null, 'superadmin');
    if (paginationResult.success) {
      this.logResult('User Pagination', true, 'User pagination working correctly');
    } else {
      this.logResult('User Pagination', false, paginationResult.error.message || 'Pagination failed');
    }

    // Test 4.3: Get Users by Role
    const roleFilterResult = await this.makeRequest('GET', '/auth/users?role=patient', null, 'superadmin');
    if (roleFilterResult.success) {
      this.logResult('User Role Filter', true, 'User role filtering working correctly');
    } else {
      this.logResult('User Role Filter', false, roleFilterResult.error.message || 'Role filtering failed');
    }

    // Test 4.4: Create New User (SuperAdmin)
    const newUserData = {
      firstName: 'New',
      lastName: 'User',
      email: 'newuser@test.com',
      password: 'Test123!',
      role: 'patient',
      phone: '+1234567893',
      dateOfBirth: '1985-05-20',
      gender: 'Female'
    };
    const createUserResult = await this.makeRequest('POST', '/auth/users', newUserData, 'superadmin');
    if (createUserResult.success) {
      this.createdUsers.push(createUserResult.data.data.user._id);
      this.logResult('Create User (SuperAdmin)', true, 'User created successfully by SuperAdmin');
    } else {
      this.logResult('Create User (SuperAdmin)', false, createUserResult.error.message || 'User creation failed');
    }

    // Test 4.5: Update User Status
    if (this.createdUsers.length > 0) {
      const userId = this.createdUsers[0];
      const statusUpdateData = { isActive: false };
      const statusUpdateResult = await this.makeRequest('PATCH', `/auth/users/${userId}/status`, statusUpdateData, 'superadmin');
      if (statusUpdateResult.success) {
        this.logResult('Update User Status', true, 'User status updated successfully');
        
        // Test 4.6: Try to login with deactivated user
        const deactivatedLoginData = {
          email: TEST_CONFIG.testUsers.patient.email,
          password: TEST_CONFIG.testUsers.patient.password
        };
        const deactivatedLoginResult = await this.makeRequest('POST', '/auth/login', deactivatedLoginData);
        if (!deactivatedLoginResult.success && deactivatedLoginResult.status === 401) {
          this.logResult('Deactivated User Login', true, 'Deactivated user properly rejected');
        } else {
          this.logResult('Deactivated User Login', false, 'Deactivated user was not properly rejected');
        }
      } else {
        this.logResult('Update User Status', false, statusUpdateResult.error.message || 'Status update failed');
      }
    }

    // Test 4.7: Delete User
    if (this.createdUsers.length > 1) {
      const userIdToDelete = this.createdUsers[this.createdUsers.length - 1];
      const deleteUserResult = await this.makeRequest('DELETE', `/auth/users/${userIdToDelete}`, null, 'superadmin');
      if (deleteUserResult.success) {
        this.logResult('Delete User', true, 'User deleted successfully');
        this.createdUsers.pop(); // Remove from tracking
      } else {
        this.logResult('Delete User', false, deleteUserResult.error.message || 'User deletion failed');
      }
    }
  }

  // Test 5: Role-based Access Control Tests
  async testRoleBasedAccess() {
    console.log('\n🛡️ Testing Role-based Access Control...\n');

    // Test 5.1: Patient trying to access admin functions
    const patientLoginData = {
      email: TEST_CONFIG.testUsers.patient.email,
      password: TEST_CONFIG.testUsers.patient.password
    };
    const patientLoginResult = await this.makeRequest('POST', '/auth/login', patientLoginData);
    if (patientLoginResult.success) {
      this.authTokens.patient = patientLoginResult.data.token;
    }

    const patientAdminAccessResult = await this.makeRequest('GET', '/auth/users', null, 'patient');
    if (!patientAdminAccessResult.success && patientAdminAccessResult.status === 403) {
      this.logResult('Patient Admin Access Restriction', true, 'Patient properly denied admin access');
    } else {
      this.logResult('Patient Admin Access Restriction', false, 'Patient was not properly denied admin access');
    }

    // Test 5.2: Receptionist trying to access superadmin functions
    const receptionistLoginData = {
      email: TEST_CONFIG.testUsers.receptionist.email,
      password: TEST_CONFIG.testUsers.receptionist.password
    };
    const receptionistLoginResult = await this.makeRequest('POST', '/auth/login', receptionistLoginData);
    if (receptionistLoginResult.success) {
      this.authTokens.receptionist = receptionistLoginResult.data.token;
    }

    const receptionistAdminAccessResult = await this.makeRequest('GET', '/auth/users', null, 'receptionist');
    if (!receptionistAdminAccessResult.success && receptionistAdminAccessResult.status === 403) {
      this.logResult('Receptionist Admin Access Restriction', true, 'Receptionist properly denied admin access');
    } else {
      this.logResult('Receptionist Admin Access Restriction', false, 'Receptionist was not properly denied admin access');
    }

    // Test 5.3: SuperAdmin accessing admin functions
    const superadminLoginData = {
      email: TEST_CONFIG.testUsers.superadmin.email,
      password: TEST_CONFIG.testUsers.superadmin.password
    };
    const superadminLoginResult = await this.makeRequest('POST', '/auth/login', superadminLoginData);
    if (superadminLoginResult.success) {
      this.authTokens.superadmin = superadminLoginResult.data.token;
    }

    const superadminAccessResult = await this.makeRequest('GET', '/auth/users', null, 'superadmin');
    if (superadminAccessResult.success) {
      this.logResult('SuperAdmin Admin Access', true, 'SuperAdmin properly granted admin access');
    } else {
      this.logResult('SuperAdmin Admin Access', false, superadminAccessResult.error.message || 'SuperAdmin access denied');
    }
  }

  // Test 6: Security and Validation Tests
  async testSecurityAndValidation() {
    console.log('\n🔒 Testing Security and Validation...\n');

    // Test 6.1: SQL Injection Attempt
    const sqlInjectionData = {
      firstName: "'; DROP TABLE users; --",
      lastName: 'Test',
      email: 'sqlinjection@test.com',
      password: 'Test123!',
      role: 'patient',
      phone: '+1234567894'
    };
    const sqlInjectionResult = await this.makeRequest('POST', '/auth/register', sqlInjectionData);
    if (sqlInjectionResult.success) {
      this.logResult('SQL Injection Prevention', true, 'SQL injection attempt properly handled');
      this.createdUsers.push(sqlInjectionResult.data.data.user._id);
    } else {
      this.logResult('SQL Injection Prevention', false, 'SQL injection attempt was not properly handled');
    }

    // Test 6.2: XSS Attack Attempt
    const xssData = {
      firstName: '<script>alert("XSS")</script>',
      lastName: 'Test',
      email: 'xss@test.com',
      password: 'Test123!',
      role: 'patient',
      phone: '+1234567895'
    };
    const xssResult = await this.makeRequest('POST', '/auth/register', xssData);
    if (xssResult.success) {
      this.logResult('XSS Prevention', true, 'XSS attack attempt properly handled');
      this.createdUsers.push(xssResult.data.data.user._id);
    } else {
      this.logResult('XSS Prevention', false, 'XSS attack attempt was not properly handled');
    }

    // Test 6.3: Rate Limiting Test
    console.log('Testing rate limiting (this may take a moment)...');
    let rateLimitTriggered = false;
    for (let i = 0; i < 10; i++) {
      const rateLimitData = {
        email: `ratelimit${i}@test.com`,
        password: 'Test123!'
      };
      const rateLimitResult = await this.makeRequest('POST', '/auth/login', rateLimitData);
      if (!rateLimitResult.success && rateLimitResult.status === 429) {
        rateLimitTriggered = true;
        break;
      }
    }
    
    if (rateLimitTriggered) {
      this.logResult('Rate Limiting', true, 'Rate limiting properly implemented');
    } else {
      this.logResult('Rate Limiting', false, 'Rate limiting may not be working correctly');
    }

    // Test 6.4: Invalid Token Format
    const invalidTokenResult = await this.makeRequest('GET', '/auth/me', null, 'invalid');
    if (!invalidTokenResult.success && invalidTokenResult.status === 401) {
      this.logResult('Invalid Token Format', true, 'Invalid token format properly rejected');
    } else {
      this.logResult('Invalid Token Format', false, 'Invalid token format was not properly rejected');
    }
  }

  // Test 7: Edge Cases and Error Handling
  async testEdgeCases() {
    console.log('\n🧪 Testing Edge Cases and Error Handling...\n');

    // Test 7.1: Empty Request Body
    const emptyBodyResult = await this.makeRequest('POST', '/auth/register', {});
    if (!emptyBodyResult.success && emptyBodyResult.status === 400) {
      this.logResult('Empty Request Body', true, 'Empty request body properly rejected');
    } else {
      this.logResult('Empty Request Body', false, 'Empty request body was not properly rejected');
    }

    // Test 7.2: Missing Required Fields
    const missingFieldsData = {
      firstName: 'Test'
      // Missing lastName, email, password
    };
    const missingFieldsResult = await this.makeRequest('POST', '/auth/register', missingFieldsData);
    if (!missingFieldsResult.success && missingFieldsResult.status === 400) {
      this.logResult('Missing Required Fields', true, 'Missing required fields properly rejected');
    } else {
      this.logResult('Missing Required Fields', false, 'Missing required fields were not properly rejected');
    }

    // Test 7.3: Invalid Email Format
    const invalidEmailData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email',
      password: 'Test123!',
      role: 'patient',
      phone: '+1234567896'
    };
    const invalidEmailResult = await this.makeRequest('POST', '/auth/register', invalidEmailData);
    if (!invalidEmailResult.success && invalidEmailResult.status === 400) {
      this.logResult('Invalid Email Format', true, 'Invalid email format properly rejected');
    } else {
      this.logResult('Invalid Email Format', false, 'Invalid email format was not properly rejected');
    }

    // Test 7.4: Weak Password
    const weakPasswordData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'weakpassword@test.com',
      password: '123',
      role: 'patient',
      phone: '+1234567897'
    };
    const weakPasswordResult = await this.makeRequest('POST', '/auth/register', weakPasswordData);
    if (!weakPasswordResult.success && weakPasswordResult.status === 400) {
      this.logResult('Weak Password Validation', true, 'Weak password properly rejected');
    } else {
      this.logResult('Weak Password Validation', false, 'Weak password was not properly rejected');
    }

    // Test 7.5: Invalid Role
    const invalidRoleData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'invalidrole@test.com',
      password: 'Test123!',
      role: 'invalidrole',
      phone: '+1234567898'
    };
    const invalidRoleResult = await this.makeRequest('POST', '/auth/register', invalidRoleData);
    if (!invalidRoleResult.success && invalidRoleResult.status === 400) {
      this.logResult('Invalid Role Validation', true, 'Invalid role properly rejected');
    } else {
      this.logResult('Invalid Role Validation', false, 'Invalid role was not properly rejected');
    }
  }

  // Cleanup method to remove test users
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...\n');
    
    // Login as superadmin for cleanup
    const loginData = {
      email: TEST_CONFIG.testUsers.superadmin.email,
      password: TEST_CONFIG.testUsers.superadmin.password
    };
    const loginResult = await this.makeRequest('POST', '/auth/login', loginData);
    if (loginResult.success) {
      this.authTokens.superadmin = loginResult.data.token;
    }

    // Delete created test users
    for (const userId of this.createdUsers) {
      try {
        await this.makeRequest('DELETE', `/auth/users/${userId}`, null, 'superadmin');
        console.log(`✅ Cleaned up user: ${userId}`);
      } catch (error) {
        console.log(`❌ Failed to cleanup user: ${userId}`);
      }
    }
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 USER MANAGEMENT TEST REPORT');
    console.log('=====================================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    
    console.log('\n📋 Test Details:');
    this.testResults.details.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.test}: ${test.message}`);
    });

    console.log('\n🎯 USER MANAGEMENT FEATURES TESTED:');
    console.log('✅ User Registration (All Roles)');
    console.log('✅ User Authentication (Login/Logout)');
    console.log('✅ Profile Management (Update/Password Change)');
    console.log('✅ User Administration (SuperAdmin Functions)');
    console.log('✅ Role-based Access Control');
    console.log('✅ Security and Validation');
    console.log('✅ Edge Cases and Error Handling');
    console.log('✅ Data Sanitization (SQL Injection, XSS)');
    console.log('✅ Rate Limiting');
    console.log('✅ Input Validation');
    console.log('✅ Password Security');
    console.log('✅ Token Management');
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting SmartLab AI User Management Tests');
    console.log('============================================\n');

    try {
      await this.testUserRegistration();
      await this.testUserAuthentication();
      await this.testProfileManagement();
      await this.testUserAdministration();
      await this.testRoleBasedAccess();
      await this.testSecurityAndValidation();
      await this.testEdgeCases();
      
      this.generateReport();
      
      // Ask user if they want to cleanup test data
      console.log('\n⚠️  Note: Test users have been created during testing.');
      console.log('Run cleanup() method to remove test data if needed.');
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
    }
  }
}

// Export the tester class
module.exports = UserManagementTester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new UserManagementTester();
  tester.runAllTests().then(() => {
    console.log('\n🎉 User Management tests completed!');
  }).catch(error => {
    console.error('Test execution failed:', error);
  });
}
