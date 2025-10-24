import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    employeeId: '',
    // Patient-specific fields
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    medicalHistory: '',
    allergies: '',
    medications: '',
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        employeeId: user.employeeId || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        address: user.address || '',
        emergencyContact: user.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        },
        medicalHistory: user.medicalHistory || '',
        allergies: user.allergies || '',
        medications: user.medications || '',
        insuranceInfo: user.insuranceInfo || {
          provider: '',
          policyNumber: '',
          groupNumber: ''
        }
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setLoading(true);
      const result = await updateProfile(profileData);
      
      if (result.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setLoading(true);
      const result = await changePassword(passwordData);
      
      if (result.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPatient = user?.role === 'patient';
  const isStaff = ['superadmin', 'receptionist'].includes(user?.role);

  return (
    <Container className="mt-4">
      <Row>
        <Col md={3}>
          <Card>
            <Card.Header>
              <h5>Profile Settings</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="list-group list-group-flush">
                <button
                  className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Information
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeTab === 'password' ? 'active' : ''}`}
                  onClick={() => setActiveTab('password')}
                >
                  Change Password
                </button>
                {isPatient && (
                  <button
                    className={`list-group-item list-group-item-action ${activeTab === 'medical' ? 'active' : ''}`}
                    onClick={() => setActiveTab('medical')}
                  >
                    Medical Information
                  </button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={9}>
          {activeTab === 'profile' && (
            <Card>
              <Card.Header>
                <h5>Profile Information</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleProfileSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                          isInvalid={!!errors.firstName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.firstName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                          isInvalid={!!errors.lastName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Email Address *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      isInvalid={!!errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Role</Form.Label>
                        <Form.Control
                          type="text"
                          value={user?.role || ''}
                          disabled
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          Role cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Staff-specific fields */}
                  {isStaff && (
                    <>
                      <hr />
                      <h6>Staff Information</h6>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Department</Form.Label>
                            <Form.Control
                              type="text"
                              name="department"
                              value={profileData.department}
                              onChange={handleProfileChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Employee ID</Form.Label>
                            <Form.Control
                              type="text"
                              name="employeeId"
                              value={profileData.employeeId}
                              onChange={handleProfileChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  <div className="d-flex justify-content-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'medical' && isPatient && (
            <Card>
              <Card.Header>
                <h5>Medical Information</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleProfileSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control
                          type="date"
                          name="dateOfBirth"
                          value={profileData.dateOfBirth}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          name="gender"
                          value={profileData.gender}
                          onChange={handleProfileChange}
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                    />
                  </Form.Group>

                  <h6 className="mb-3">Emergency Contact</h6>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Contact Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="emergencyContact.name"
                          value={profileData.emergencyContact.name}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Contact Phone</Form.Label>
                        <Form.Control
                          type="tel"
                          name="emergencyContact.phone"
                          value={profileData.emergencyContact.phone}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Relationship</Form.Label>
                        <Form.Control
                          type="text"
                          name="emergencyContact.relationship"
                          value={profileData.emergencyContact.relationship}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Medical History</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="medicalHistory"
                      value={profileData.medicalHistory}
                      onChange={handleProfileChange}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Allergies</Form.Label>
                        <Form.Control
                          type="text"
                          name="allergies"
                          value={profileData.allergies}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Medications</Form.Label>
                        <Form.Control
                          type="text"
                          name="medications"
                          value={profileData.medications}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="mb-3">Insurance Information</h6>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Insurance Provider</Form.Label>
                        <Form.Control
                          type="text"
                          name="insuranceInfo.provider"
                          value={profileData.insuranceInfo.provider}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Policy Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="insuranceInfo.policyNumber"
                          value={profileData.insuranceInfo.policyNumber}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Group Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="insuranceInfo.groupNumber"
                          value={profileData.insuranceInfo.groupNumber}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Updating...
                        </>
                      ) : (
                        'Update Medical Info'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card>
              <Card.Header>
                <h5>Change Password</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handlePasswordSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      isInvalid={!!errors.currentPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.currentPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>New Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      isInvalid={!!errors.newPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.newPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Confirm New Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      isInvalid={!!errors.confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <div className="d-flex justify-content-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;
