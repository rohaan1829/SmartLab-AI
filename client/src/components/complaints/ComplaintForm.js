import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { complaintAPI } from '../../services/api';

const ComplaintForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    patientId: '',
    subject: '',
    description: '',
    category: 'General',
    priority: 'Medium',
    contactMethod: 'Email',
    preferredContactTime: '',
    attachments: []
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchComplaint = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getById(id);
      const complaint = response.data;
      
      setFormData({
        patientId: complaint.patientId?._id || complaint.patientId || '',
        subject: complaint.subject || '',
        description: complaint.description || '',
        category: complaint.category || 'General',
        priority: complaint.priority || 'Medium',
        contactMethod: complaint.contactMethod || 'Email',
        preferredContactTime: complaint.preferredContactTime || '',
        attachments: complaint.attachments || []
      });
    } catch (error) {
      toast.error('Error fetching complaint');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (hasRole('patient')) {
      // For patients, set their own ID
      setFormData(prev => ({ ...prev, patientId: user.id }));
    }
    
    if (isEdit) {
      fetchComplaint();
    }
  }, [isEdit, fetchComplaint, hasRole, user.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
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
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    
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
        status: 'Open', // All new complaints start as open
        // Convert empty strings to null for optional fields
        preferredContactTime: formData.preferredContactTime || null,
        attachments: formData.attachments || []
      };
      
      if (isEdit) {
        await complaintAPI.update(id, submitData);
        toast.success('Complaint updated successfully');
      } else {
        await complaintAPI.create(submitData);
        toast.success('Complaint created successfully');
      }
      
      navigate('/complaints');
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.param] = err.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error saving complaint');
      }
    } finally {
      setSaving(false);
    }
  };

  const canCreateComplaints = hasRole('patient') || hasRole('superadmin') || hasRole('receptionist');

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!canCreateComplaints) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to create complaints.</p>
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
                <i className="fas fa-comments me-2"></i>
                {isEdit ? 'Edit Complaint' : 'Create New Complaint'}
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Patient Selection (for staff only) */}
                {!hasRole('patient') && (
                  <Form.Group className="mb-3">
                    <Form.Label>Patient *</Form.Label>
                    <Form.Select
                      name="patientId"
                      value={formData.patientId}
                      onChange={handleChange}
                      isInvalid={!!errors.patientId}
                    >
                      <option value="">Select Patient</option>
                      {/* In a real app, you'd fetch patients from API */}
                      <option value="patient1">John Doe - john@example.com</option>
                      <option value="patient2">Jane Smith - jane@example.com</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.patientId}
                    </Form.Control.Feedback>
                  </Form.Group>
                )}

                {hasRole('patient') && (
                  <Alert variant="info" className="mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    You are creating a complaint for yourself. Our staff will review and respond to your complaint.
                  </Alert>
                )}

                {/* Subject and Category */}
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subject *</Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        isInvalid={!!errors.subject}
                        placeholder="Brief description of your complaint..."
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.subject}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category *</Form.Label>
                      <Form.Select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        isInvalid={!!errors.category}
                      >
                        <option value="General">General</option>
                        <option value="Service Quality">Service Quality</option>
                        <option value="Billing">Billing</option>
                        <option value="Appointment">Appointment</option>
                        <option value="Staff Behavior">Staff Behavior</option>
                        <option value="Facility">Facility</option>
                        <option value="Test Results">Test Results</option>
                        <option value="Privacy">Privacy</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.category}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Description */}
                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    isInvalid={!!errors.description}
                    placeholder="Please provide detailed information about your complaint. Include dates, times, names of staff members involved, and any other relevant details..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    The more details you provide, the better we can address your concern.
                  </Form.Text>
                </Form.Group>

                {/* Priority and Contact Information */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Priority</Form.Label>
                      <Form.Select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        isInvalid={!!errors.priority}
                      >
                        <option value="Low">Low - Can be addressed in normal timeframe</option>
                        <option value="Medium">Medium - Standard priority</option>
                        <option value="High">High - Requires prompt attention</option>
                        <option value="Urgent">Urgent - Immediate attention required</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.priority}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Preferred Contact Method</Form.Label>
                      <Form.Select
                        name="contactMethod"
                        value={formData.contactMethod}
                        onChange={handleChange}
                      >
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="In Person">In Person</option>
                        <option value="Mail">Mail</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Preferred Contact Time */}
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Contact Time</Form.Label>
                  <Form.Control
                    type="text"
                    name="preferredContactTime"
                    value={formData.preferredContactTime}
                    onChange={handleChange}
                    placeholder="e.g., Weekdays 9 AM - 5 PM, or specific times..."
                  />
                  <Form.Text className="text-muted">
                    Let us know when you'd prefer to be contacted about this complaint.
                  </Form.Text>
                </Form.Group>

                {/* Additional Information */}
                <Form.Group className="mb-3">
                  <Form.Label>Additional Information</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="additionalInfo"
                    placeholder="Any other information that might help us resolve your complaint..."
                  />
                </Form.Group>

                {/* File Attachments */}
                <Form.Group className="mb-3">
                  <Form.Label>Attachments (Optional)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      // Handle file uploads
                      const files = Array.from(e.target.files);
                      setFormData(prev => ({
                        ...prev,
                        attachments: [...prev.attachments, ...files]
                      }));
                    }}
                  />
                  <Form.Text className="text-muted">
                    You can attach relevant documents, photos, or other files (PDF, DOC, JPG, PNG).
                  </Form.Text>
                </Form.Group>

                {/* Terms and Conditions */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="agreeToTerms"
                    label="I agree to the complaint handling terms and conditions"
                    required
                  />
                  <Form.Text className="text-muted">
                    By submitting this complaint, you agree that we may contact you regarding this matter and that the information provided is accurate to the best of your knowledge.
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/complaints')}
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
                        {isEdit ? 'Update Complaint' : 'Submit Complaint'}
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

export default ComplaintForm;
