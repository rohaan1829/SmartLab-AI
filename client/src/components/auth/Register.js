import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient', // Default to patient for self-registration
    department: '',
    employeeId: '',
    phone: '',
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'patient') {
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required for patients';
      }
      if (!formData.gender) {
        newErrors.gender = 'Gender is required for patients';
      }
    } else if (['superadmin', 'receptionist'].includes(formData.role)) {
      if (!formData.department.trim()) {
        newErrors.department = 'Department is required for staff';
      }
      if (!formData.employeeId.trim()) {
        newErrors.employeeId = 'Employee ID is required for staff';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setLoading(true);
      
      const { confirmPassword, ...userData } = formData;
      const result = await register(userData);
      
      if (result.success) {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        if (result.errors && result.errors.length > 0) {
          const newErrors = {};
          result.errors.forEach(error => {
            newErrors[error.field] = error.message;
          });
          setErrors(newErrors);
        }
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPatient = formData.role === 'patient';
  const isStaff = ['superadmin', 'receptionist'].includes(formData.role);

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow">
            <Card.Header className="text-center bg-primary text-white">
              <h4 className="mb-0">SmartLab AI Registration</h4>
              <small>Join our medical laboratory management system</small>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-4">
                <strong>Registration Information:</strong>
                <ul className="mb-0 mt-2">
                  <li><strong>Patients:</strong> Can self-register and manage their own appointments, reports, and payments</li>
                  <li><strong>Staff:</strong> Must be created by SuperAdmin with proper credentials</li>
                </ul>
              </Alert>

              <Form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        isInvalid={!!errors.firstName}
                        placeholder="Enter first name"
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
                        value={formData.lastName}
                        onChange={handleChange}
                        isInvalid={!!errors.lastName}
                        placeholder="Enter last name"
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
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    placeholder="Enter your email"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password *</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={!!errors.password}
                        placeholder="Enter password"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirm Password *</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        isInvalid={!!errors.confirmPassword}
                        placeholder="Confirm password"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Role Selection */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Role *</Form.Label>
                      <Form.Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="patient">Patient</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="superadmin">SuperAdmin</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Patients can self-register. Staff roles require SuperAdmin approval.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Staff-specific fields */}
                {isStaff && (
                  <>
                    <hr />
                    <h5 className="mb-3">Staff Information</h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Department *</Form.Label>
                          <Form.Control
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            isInvalid={!!errors.department}
                            placeholder="Enter department"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.department}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Employee ID *</Form.Label>
                          <Form.Control
                            type="text"
                            name="employeeId"
                            value={formData.employeeId}
                            onChange={handleChange}
                            isInvalid={!!errors.employeeId}
                            placeholder="Enter employee ID"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.employeeId}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                {/* Patient-specific fields */}
                {isPatient && (
                  <>
                    <hr />
                    <h5 className="mb-3">Patient Information</h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date of Birth *</Form.Label>
                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            isInvalid={!!errors.dateOfBirth}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.dateOfBirth}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Gender *</Form.Label>
                          <Form.Select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            isInvalid={!!errors.gender}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.gender}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
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
                            value={formData.emergencyContact.name}
                            onChange={handleChange}
                            placeholder="Contact name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Contact Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            name="emergencyContact.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleChange}
                            placeholder="Contact phone"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Relationship</Form.Label>
                          <Form.Control
                            type="text"
                            name="emergencyContact.relationship"
                            value={formData.emergencyContact.relationship}
                            onChange={handleChange}
                            placeholder="Relationship"
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
                        value={formData.medicalHistory}
                        onChange={handleChange}
                        placeholder="Enter your medical history"
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Allergies</Form.Label>
                          <Form.Control
                            type="text"
                            name="allergies"
                            value={formData.allergies}
                            onChange={handleChange}
                            placeholder="List any allergies"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Current Medications</Form.Label>
                          <Form.Control
                            type="text"
                            name="medications"
                            value={formData.medications}
                            onChange={handleChange}
                            placeholder="Current medications"
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
                            value={formData.insuranceInfo.provider}
                            onChange={handleChange}
                            placeholder="Insurance provider"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Policy Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="insuranceInfo.policyNumber"
                            value={formData.insuranceInfo.policyNumber}
                            onChange={handleChange}
                            placeholder="Policy number"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Group Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="insuranceInfo.groupNumber"
                            value={formData.insuranceInfo.groupNumber}
                            onChange={handleChange}
                            placeholder="Group number"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <small className="text-muted">
                    Already have an account?{' '}
                    <Link to="/login" className="text-decoration-none">
                      Sign in here
                    </Link>
                  </small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;