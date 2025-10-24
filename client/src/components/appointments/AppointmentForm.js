import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentAPI, patientAPI } from '../../services/api';

const AppointmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    type: '',
    reason: '',
    notes: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    followUpRequired: false,
    followUpDate: '',
    cost: 0,
    paymentStatus: 'Pending',
    homeCollection: {
      requested: false,
      address: '',
      contactPhone: '',
      preferredTime: '',
      specialInstructions: ''
    }
  });

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getById(id);
      const appointment = response.data;
      
      setFormData({
        patientId: appointment.patientId?._id || appointment.patientId || '',
        appointmentDate: appointment.appointmentDate ? 
          new Date(appointment.appointmentDate).toISOString().split('T')[0] : '',
        appointmentTime: appointment.appointmentTime || '',
        duration: appointment.duration || 30,
        type: appointment.type || '',
        reason: appointment.reason || '',
        notes: appointment.notes || '',
        symptoms: appointment.symptoms || '',
        diagnosis: appointment.diagnosis || '',
        treatment: appointment.treatment || '',
        followUpRequired: appointment.followUpRequired || false,
        followUpDate: appointment.followUpDate ? 
          new Date(appointment.followUpDate).toISOString().split('T')[0] : '',
        cost: appointment.cost || 0,
        paymentStatus: appointment.paymentStatus || 'Pending',
        homeCollection: appointment.homeCollection || {
          requested: false,
          address: '',
          contactPhone: '',
          preferredTime: '',
          specialInstructions: ''
        }
      });
    } catch (error) {
      toast.error('Error fetching appointment');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (hasRole('patient')) {
      // For patients, set their own ID
      setFormData(prev => ({ ...prev, patientId: user.id }));
    } else {
      fetchPatients();
    }
    
    if (isEdit) {
      fetchAppointment();
    }
  }, [isEdit, fetchAppointment, hasRole, user.id]);

  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll({ limit: 1000 });
      setPatients(response.data.patients);
    } catch (error) {
      toast.error('Error fetching patients');
      console.error('Error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
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
    
    if (!formData.patientId) newErrors.patientId = 'Patient is required';
    if (!formData.appointmentDate) newErrors.appointmentDate = 'Appointment date is required';
    if (!formData.appointmentTime) newErrors.appointmentTime = 'Appointment time is required';
    if (!formData.type) newErrors.type = 'Appointment type is required';
    if (!formData.reason) newErrors.reason = 'Reason is required';
    
    // Home collection validation
    if (formData.homeCollection.requested) {
      if (!formData.homeCollection.address) newErrors['homeCollection.address'] = 'Address is required for home collection';
      if (!formData.homeCollection.contactPhone) newErrors['homeCollection.contactPhone'] = 'Contact phone is required for home collection';
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
        status: 'Pending', // All new appointments start as pending
        // Convert empty strings to null for optional fields
        symptoms: formData.symptoms || null,
        diagnosis: formData.diagnosis || null,
        treatment: formData.treatment || null,
        notes: formData.notes || null,
        followUpDate: formData.followUpRequired && formData.followUpDate ? formData.followUpDate : null,
        homeCollection: formData.homeCollection.requested ? formData.homeCollection : null
      };
      
      if (isEdit) {
        await appointmentAPI.update(id, submitData);
        toast.success('Appointment updated successfully');
      } else {
        await appointmentAPI.create(submitData);
        toast.success('Appointment created successfully');
      }
      
      navigate('/appointments');
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.param] = err.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error saving appointment');
      }
    } finally {
      setSaving(false);
    }
  };

  const canManageAppointments = hasRole('superadmin') || hasRole('receptionist');
  const canBookAppointments = hasRole('patient') || canManageAppointments;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!canBookAppointments) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to book appointments.</p>
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
                <i className="fas fa-calendar-plus me-2"></i>
                {isEdit ? 'Edit Appointment' : 'Book New Appointment'}
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Patient Selection */}
                {!hasRole('patient') && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Patient *</Form.Label>
                        <Form.Select
                          name="patientId"
                          value={formData.patientId}
                          onChange={handleChange}
                          isInvalid={!!errors.patientId}
                        >
                          <option value="">Select Patient</option>
                          {patients.map(patient => (
                            <option key={patient._id} value={patient._id}>
                              {patient.firstName} {patient.lastName} - {patient.email}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.patientId}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {hasRole('patient') && (
                  <Alert variant="info" className="mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    You are booking an appointment for yourself. All appointments require approval from our receptionist.
                  </Alert>
                )}

                {/* Appointment Details */}
                <h5 className="mb-3">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Appointment Details
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Appointment Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="appointmentDate"
                        value={formData.appointmentDate}
                        onChange={handleChange}
                        isInvalid={!!errors.appointmentDate}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.appointmentDate}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Appointment Time *</Form.Label>
                      <Form.Control
                        type="time"
                        name="appointmentTime"
                        value={formData.appointmentTime}
                        onChange={handleChange}
                        isInvalid={!!errors.appointmentTime}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.appointmentTime}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="15"
                        max="240"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Appointment Type *</Form.Label>
                      <Form.Select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        isInvalid={!!errors.type}
                      >
                        <option value="">Select Type</option>
                        <option value="Blood Test">Blood Test</option>
                        <option value="Urine Test">Urine Test</option>
                        <option value="X-Ray">X-Ray</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="MRI">MRI</option>
                        <option value="Ultrasound">Ultrasound</option>
                        <option value="ECG">ECG</option>
                        <option value="Consultation">Consultation</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.type}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Reason and Notes */}
                <Form.Group className="mb-3">
                  <Form.Label>Reason for Appointment *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    isInvalid={!!errors.reason}
                    placeholder="Please describe the reason for this appointment..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.reason}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Any additional information or special requirements..."
                  />
                </Form.Group>

                {/* Medical Information */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-stethoscope me-2"></i>
                  Medical Information
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Symptoms</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="symptoms"
                        value={formData.symptoms}
                        onChange={handleChange}
                        placeholder="Describe any symptoms you're experiencing..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Medications</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="medications"
                        value={formData.medications}
                        onChange={handleChange}
                        placeholder="List any current medications..."
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Home Collection Request */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-home me-2"></i>
                  Home Sample Collection
                </h5>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="homeCollection.requested"
                    label="Request home sample collection"
                    checked={formData.homeCollection.requested}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted">
                    Check this if you need sample collection at your home address
                  </Form.Text>
                </Form.Group>

                {formData.homeCollection.requested && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Collection Address *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="homeCollection.address"
                          value={formData.homeCollection.address}
                          onChange={handleChange}
                          isInvalid={!!errors['homeCollection.address']}
                          placeholder="Enter the address where samples should be collected..."
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors['homeCollection.address']}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Contact Phone *</Form.Label>
                        <Form.Control
                          type="tel"
                          name="homeCollection.contactPhone"
                          value={formData.homeCollection.contactPhone}
                          onChange={handleChange}
                          isInvalid={!!errors['homeCollection.contactPhone']}
                          placeholder="Phone number for collection team"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors['homeCollection.contactPhone']}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {formData.homeCollection.requested && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Preferred Collection Time</Form.Label>
                        <Form.Control
                          type="time"
                          name="homeCollection.preferredTime"
                          value={formData.homeCollection.preferredTime}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Special Instructions</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="homeCollection.specialInstructions"
                          value={formData.homeCollection.specialInstructions}
                          onChange={handleChange}
                          placeholder="Any special instructions for collection..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Follow-up Information */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-calendar-check me-2"></i>
                  Follow-up Information
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        name="followUpRequired"
                        label="Follow-up Required"
                        checked={formData.followUpRequired}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    {formData.followUpRequired && (
                      <Form.Group className="mb-3">
                        <Form.Label>Follow-up Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="followUpDate"
                          value={formData.followUpDate}
                          onChange={handleChange}
                          min={formData.appointmentDate}
                        />
                      </Form.Group>
                    )}
                  </Col>
                </Row>

                {/* Cost and Payment */}
                {canManageAppointments && (
                  <>
                    <h5 className="mt-4 mb-3">
                      <i className="fas fa-dollar-sign me-2"></i>
                      Cost & Payment
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Estimated Cost</Form.Label>
                          <Form.Control
                            type="number"
                            name="cost"
                            value={formData.cost}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Payment Status</Form.Label>
                          <Form.Select
                            name="paymentStatus"
                            value={formData.paymentStatus}
                            onChange={handleChange}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Partial">Partial</option>
                            <option value="Insurance">Insurance</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/appointments')}
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
                        {isEdit ? 'Update Appointment' : 'Book Appointment'}
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

export default AppointmentForm;
