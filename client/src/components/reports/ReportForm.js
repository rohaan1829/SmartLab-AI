import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { reportAPI, patientAPI, appointmentAPI } from '../../services/api';

const ReportForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    reportType: '',
    title: '',
    description: '',
    findings: [],
    diagnosis: '',
    recommendations: [],
    followUpRequired: false,
    followUpDate: '',
    priority: 'Medium',
    isConfidential: false,
    attachments: []
  });

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getById(id);
      const report = response.data;
      
      setFormData({
        patientId: report.patientId?._id || report.patientId || '',
        appointmentId: report.appointmentId?._id || report.appointmentId || '',
        reportType: report.reportType || '',
        title: report.title || '',
        description: report.description || '',
        findings: report.findings || [],
        diagnosis: report.diagnosis || '',
        recommendations: report.recommendations || [],
        followUpRequired: report.followUpRequired || false,
        followUpDate: report.followUpDate ? 
          new Date(report.followUpDate).toISOString().split('T')[0] : '',
        priority: report.priority || 'Medium',
        isConfidential: report.isConfidential || false,
        attachments: report.attachments || []
      });
    } catch (error) {
      toast.error('Error fetching report');
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
      fetchReport();
    }
  }, [isEdit, fetchReport, hasRole, user.id]);

  useEffect(() => {
    if (formData.patientId) {
      fetchAppointments(formData.patientId);
    }
  }, [formData.patientId]);

  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getAll({ limit: 1000 });
      setPatients(response.data.patients);
    } catch (error) {
      toast.error('Error fetching patients');
      console.error('Error:', error);
    }
  };

  const fetchAppointments = async (patientId) => {
    try {
      const response = await appointmentAPI.getAll({ patientId, limit: 1000 });
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

 

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

  const handleArrayChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const addFinding = () => {
    setFormData(prev => ({
      ...prev,
      findings: [...prev.findings, { testName: '', result: '', normalRange: '', status: 'Normal', unit: '' }]
    }));
  };

  const updateFinding = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      findings: prev.findings.map((finding, i) => 
        i === index ? { ...finding, [field]: value } : finding
      )
    }));
  };

  const removeFinding = (index) => {
    setFormData(prev => ({
      ...prev,
      findings: prev.findings.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientId) newErrors.patientId = 'Patient is required';
    if (!formData.appointmentId) newErrors.appointmentId = 'Appointment is required';
    if (!formData.reportType) newErrors.reportType = 'Report type is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
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
        status: 'Draft', // All new reports start as draft
        createdBy: user.id, // Set the creator
        // Convert empty strings to null for optional fields
        diagnosis: formData.diagnosis || null,
        followUpDate: formData.followUpRequired && formData.followUpDate ? formData.followUpDate : null,
        attachments: formData.attachments || []
      };
      
      if (isEdit) {
        await reportAPI.update(id, submitData);
        toast.success('Report updated successfully');
      } else {
        await reportAPI.create(submitData);
        toast.success('Report created successfully');
      }
      
      navigate('/reports');
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.param] = err.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error saving report');
      }
    } finally {
      setSaving(false);
    }
  };

  const canManageReports = hasRole('superadmin') || hasRole('receptionist');
  const canCreateReports = hasRole('patient') || canManageReports;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!canCreateReports) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to create reports.</p>
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
                <i className="fas fa-file-medical-alt me-2"></i>
                {isEdit ? 'Edit Report' : 'Create New Report'}
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Patient and Appointment Selection */}
                {!hasRole('patient') && (
                  <Row>
                    <Col md={6}>
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
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Appointment *</Form.Label>
                        <Form.Select
                          name="appointmentId"
                          value={formData.appointmentId}
                          onChange={handleChange}
                          isInvalid={!!errors.appointmentId}
                          disabled={!formData.patientId}
                        >
                          <option value="">Select Appointment</option>
                          {appointments.map(appointment => (
                            <option key={appointment._id} value={appointment._id}>
                              {new Date(appointment.appointmentDate).toLocaleDateString()} - {appointment.reason}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.appointmentId}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {hasRole('patient') && (
                  <Alert variant="info" className="mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    You are creating a report for yourself. All reports require review from our staff.
                  </Alert>
                )}

                {/* Report Type and Priority */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Report Type *</Form.Label>
                      <Form.Select
                        name="reportType"
                        value={formData.reportType}
                        onChange={handleChange}
                        isInvalid={!!errors.reportType}
                      >
                        <option value="">Select Type</option>
                        <option value="Blood Test">Blood Test</option>
                        <option value="Urine Test">Urine Test</option>
                        <option value="X-Ray">X-Ray</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="MRI">MRI</option>
                        <option value="Ultrasound">Ultrasound</option>
                        <option value="ECG">ECG</option>
                        <option value="Pathology">Pathology</option>
                        <option value="General">General</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.reportType}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Priority</Form.Label>
                      <Form.Select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Title and Description */}
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    isInvalid={!!errors.title}
                    placeholder="Enter report title..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.title}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    isInvalid={!!errors.description}
                    placeholder="Describe the report findings and observations..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Test Findings */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-flask me-2"></i>
                  Test Findings
                </h5>
                {formData.findings.map((finding, index) => (
                  <Card key={index} className="mb-3">
                    <Card.Body>
                      <Row>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label>Test Name</Form.Label>
                            <Form.Control
                              type="text"
                              value={finding.testName}
                              onChange={(e) => updateFinding(index, 'testName', e.target.value)}
                              placeholder="e.g., Hemoglobin"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Result</Form.Label>
                            <Form.Control
                              type="text"
                              value={finding.result}
                              onChange={(e) => updateFinding(index, 'result', e.target.value)}
                              placeholder="e.g., 14.2"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Unit</Form.Label>
                            <Form.Control
                              type="text"
                              value={finding.unit}
                              onChange={(e) => updateFinding(index, 'unit', e.target.value)}
                              placeholder="e.g., g/dL"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Normal Range</Form.Label>
                            <Form.Control
                              type="text"
                              value={finding.normalRange}
                              onChange={(e) => updateFinding(index, 'normalRange', e.target.value)}
                              placeholder="e.g., 12-16"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              value={finding.status}
                              onChange={(e) => updateFinding(index, 'status', e.target.value)}
                            >
                              <option value="Normal">Normal</option>
                              <option value="Abnormal">Abnormal</option>
                              <option value="Critical">Critical</option>
                              <option value="Pending">Pending</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group className="mb-3">
                            <Form.Label>&nbsp;</Form.Label>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeFinding(index)}
                              className="d-block"
                              title="Remove Finding"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
                <Button variant="outline-primary" onClick={addFinding} className="mb-3">
                  <i className="fas fa-plus me-1"></i>
                  Add Finding
                </Button>

                {/* Diagnosis and Recommendations */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-stethoscope me-2"></i>
                  Medical Assessment
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Diagnosis</Form.Label>
                      <Form.Control
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        placeholder="Enter diagnosis if applicable..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recommendations</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData.recommendations.join(', ')}
                        onChange={(e) => handleArrayChange('recommendations', e.target.value)}
                        placeholder="Enter recommendations (comma-separated)..."
                      />
                    </Form.Group>
                  </Col>
                </Row>

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
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </Form.Group>
                    )}
                  </Col>
                </Row>

                {/* Confidentiality */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="isConfidential"
                    label="Confidential Report"
                    checked={formData.isConfidential}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted">
                    Mark as confidential if this report contains sensitive information
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/reports')}
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
                        {isEdit ? 'Update Report' : 'Create Report'}
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

export default ReportForm;
