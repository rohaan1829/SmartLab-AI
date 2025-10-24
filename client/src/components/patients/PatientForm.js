import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { patientAPI } from '../../services/api';

const PatientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    medicalHistory: '',
    allergies: '',
    medications: '',
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: ''
    },
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getById(id);
      const patient = response.data;
      
      // Convert date to YYYY-MM-DD format for input
      const dateOfBirth = patient.dateOfBirth ? 
        new Date(patient.dateOfBirth).toISOString().split('T')[0] : '';
      
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        phone: patient.phone || '',
        dateOfBirth: dateOfBirth,
        gender: patient.gender || '',
        address: patient.address || '',
        emergencyContact: patient.emergencyContact || {
          name: '',
          relationship: '',
          phone: ''
        },
        medicalHistory: patient.medicalHistory || '',
        allergies: patient.allergies || '',
        medications: patient.medications || '',
        insuranceInfo: patient.insuranceInfo || {
          provider: '',
          policyNumber: '',
          groupNumber: ''
        },
        status: patient.status || 'active'
      });
    } catch (error) {
      toast.error('Error fetching patient');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      fetchPatient();
    }
  }, [isEdit, fetchPatient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
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
      setSaving(true);
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        role: 'patient', // Ensure role is set to patient
        // Convert empty strings to null for optional fields
        address: formData.address || null,
        medicalHistory: formData.medicalHistory || null,
        allergies: formData.allergies || null,
        medications: formData.medications || null,
        emergencyContact: {
          name: formData.emergencyContact.name || null,
          relationship: formData.emergencyContact.relationship || null,
          phone: formData.emergencyContact.phone || null
        },
        insuranceInfo: {
          provider: formData.insuranceInfo.provider || null,
          policyNumber: formData.insuranceInfo.policyNumber || null,
          groupNumber: formData.insuranceInfo.groupNumber || null
        }
      };
      
      if (isEdit) {
        await patientAPI.update(id, submitData);
        toast.success('Patient updated successfully');
      } else {
        await patientAPI.create(submitData);
        toast.success('Patient created successfully');
      }
      
      navigate('/patients');
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.param] = err.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error saving patient');
      }
    } finally {
      setSaving(false);
    }
  };

  const canManagePatients = hasRole('superadmin') || hasRole('receptionist');

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!canManagePatients) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to manage patients.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-user-plus me-2"></i>
                {isEdit ? 'Edit Patient' : 'Add New Patient'}
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <h5 className="mb-3">
                  <i className="fas fa-user me-2"></i>
                  Basic Information
                </h5>
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

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email}
                        placeholder="Enter email address"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        isInvalid={!!errors.phone}
                        placeholder="Enter phone number"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

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
                        <option value="">Select Gender</option>
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

                {/* Address */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-map-marker-alt me-2"></i>
                  Address
                </h5>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter full address"
                  />
                </Form.Group>

                {/* Emergency Contact */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-phone-alt me-2"></i>
                  Emergency Contact
                </h5>
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
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="emergencyContact.phone"
                        value={formData.emergencyContact.phone}
                        onChange={handleChange}
                        placeholder="Phone number"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Medical Information */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-heartbeat me-2"></i>
                  Medical Information
                </h5>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Medical History</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="medicalHistory"
                        value={formData.medicalHistory}
                        onChange={handleChange}
                        placeholder="Enter medical history"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Allergies</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="List any allergies"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Medications</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="medications"
                        value={formData.medications}
                        onChange={handleChange}
                        placeholder="Current medications"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Insurance Information */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-shield-alt me-2"></i>
                  Insurance Information
                </h5>
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

                {/* Status (only for staff) */}
                {hasRole('superadmin') && (
                  <>
                    <h5 className="mt-4 mb-3">
                      <i className="fas fa-cog me-2"></i>
                      Account Status
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Status</Form.Label>
                          <Form.Select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/patients')}
                    disabled={saving}
                  >
                    <i className="fas fa-times me-1"></i>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        {isEdit ? 'Update Patient' : 'Create Patient'}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PatientForm;
