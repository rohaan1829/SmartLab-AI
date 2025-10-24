import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI, patientAPI, appointmentAPI } from '../../services/api';

const PaymentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    amount: 0,
    currency: 'USD',
    paymentMethod: '',
    paymentStatus: 'Pending',
    dueDate: '',
    description: '',
    items: [],
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      claimNumber: '',
      coverageAmount: 0,
      patientResponsibility: 0
    },
    notes: ''
  });

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchPayment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getById(id);
      const payment = response.data;
      
      setFormData({
        patientId: payment.patientId?._id || payment.patientId || '',
        appointmentId: payment.appointmentId?._id || payment.appointmentId || '',
        amount: payment.amount || 0,
        currency: payment.currency || 'USD',
        paymentMethod: payment.paymentMethod || '',
        paymentStatus: payment.paymentStatus || 'Pending',
        dueDate: payment.dueDate ? 
          new Date(payment.dueDate).toISOString().split('T')[0] : '',
        description: payment.description || '',
        items: payment.items || [],
        taxAmount: payment.taxAmount || 0,
        discountAmount: payment.discountAmount || 0,
        totalAmount: payment.totalAmount || 0,
        insuranceInfo: payment.insuranceInfo || {
          provider: '',
          policyNumber: '',
          claimNumber: '',
          coverageAmount: 0,
          patientResponsibility: 0
        },
        notes: payment.notes || ''
      });
    } catch (error) {
      toast.error('Error fetching payment');
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
      fetchPayment();
    }
  }, [isEdit, fetchPayment, hasRole, user.id]);

  useEffect(() => {
    if (formData.patientId) {
      fetchAppointments(formData.patientId);
    }
  }, [formData.patientId]);

  useEffect(() => {
    // Calculate total amount when items change
    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const total = itemsTotal + formData.taxAmount - formData.discountAmount;
    setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.items, formData.taxAmount, formData.discountAmount]);

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
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: parseFloat(value) || value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: field === 'quantity' || field === 'unitPrice' ? parseFloat(value) || 0 : value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientId) newErrors.patientId = 'Patient is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.totalAmount || formData.totalAmount <= 0) newErrors.totalAmount = 'Valid total amount is required';
    
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
        createdBy: user.id, // Set the creator
        // Convert empty strings to null for optional fields
        appointmentId: formData.appointmentId || null,
        notes: formData.notes || null,
        insuranceInfo: formData.insuranceInfo.provider ? formData.insuranceInfo : null
      };
      
      if (isEdit) {
        await paymentAPI.update(id, submitData);
        toast.success('Payment updated successfully');
      } else {
        await paymentAPI.create(submitData);
        toast.success('Payment created successfully');
      }
      
      navigate('/payments');
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.param] = err.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error saving payment');
      }
    } finally {
      setSaving(false);
    }
  };

  const canManagePayments = hasRole('superadmin') || hasRole('receptionist');
  const canCreatePayments = hasRole('patient') || canManagePayments;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!canCreatePayments) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to create payments.</p>
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
                <i className="fas fa-credit-card me-2"></i>
                {isEdit ? 'Edit Payment' : 'Create New Payment'}
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
                        <Form.Label>Appointment</Form.Label>
                        <Form.Select
                          name="appointmentId"
                          value={formData.appointmentId}
                          onChange={handleChange}
                          disabled={!formData.patientId}
                        >
                          <option value="">Select Appointment (Optional)</option>
                          {appointments.map(appointment => (
                            <option key={appointment._id} value={appointment._id}>
                              {new Date(appointment.appointmentDate).toLocaleDateString()} - {appointment.reason}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {hasRole('patient') && (
                  <Alert variant="info" className="mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    You are creating a payment for yourself. All payments require processing by our staff.
                  </Alert>
                )}

                {/* Payment Details */}
                <h5 className="mb-3">
                  <i className="fas fa-dollar-sign me-2"></i>
                  Payment Details
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount *</Form.Label>
                      <Form.Control
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        isInvalid={!!errors.amount}
                        placeholder="0.00"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.amount}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Method *</Form.Label>
                      <Form.Select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        isInvalid={!!errors.paymentMethod}
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Check">Check</option>
                        <option value="Online Payment">Online Payment</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.paymentMethod}
                      </Form.Control.Feedback>
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
                        <option value="Failed">Failed</option>
                        <option value="Refunded">Refunded</option>
                        <option value="Partially Paid">Partially Paid</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Due Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleChange}
                        isInvalid={!!errors.dueDate}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.dueDate}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    isInvalid={!!errors.description}
                    placeholder="Describe the payment purpose..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Payment Items */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-list me-2"></i>
                  Payment Items
                </h5>
                {formData.items.map((item, index) => (
                  <Card key={index} className="mb-3">
                    <Card.Body>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description..."
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Quantity</Form.Label>
                            <Form.Control
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              min="1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Unit Price</Form.Label>
                            <Form.Control
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>Total</Form.Label>
                            <Form.Control
                              type="number"
                              value={item.totalPrice}
                              readOnly
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-3">
                            <Form.Label>&nbsp;</Form.Label>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="d-block"
                              title="Remove Item"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
                <Button variant="outline-primary" onClick={addItem} className="mb-3">
                  <i className="fas fa-plus me-1"></i>
                  Add Item
                </Button>

                {/* Tax and Discount */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-calculator me-2"></i>
                  Tax & Discount
                </h5>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tax Amount</Form.Label>
                      <Form.Control
                        type="number"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Discount Amount</Form.Label>
                      <Form.Control
                        type="number"
                        name="discountAmount"
                        value={formData.discountAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Total Amount *</Form.Label>
                      <Form.Control
                        type="number"
                        name="totalAmount"
                        value={formData.totalAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        isInvalid={!!errors.totalAmount}
                        readOnly
                        className="bg-light"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.totalAmount}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Insurance Information */}
                <h5 className="mt-4 mb-3">
                  <i className="fas fa-shield-alt me-2"></i>
                  Insurance Information
                </h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Provider</Form.Label>
                      <Form.Control
                        type="text"
                        name="insuranceInfo.provider"
                        value={formData.insuranceInfo.provider}
                        onChange={handleChange}
                        placeholder="Insurance provider name..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Policy Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="insuranceInfo.policyNumber"
                        value={formData.insuranceInfo.policyNumber}
                        onChange={handleChange}
                        placeholder="Policy number..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Claim Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="insuranceInfo.claimNumber"
                        value={formData.insuranceInfo.claimNumber}
                        onChange={handleChange}
                        placeholder="Claim number..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Coverage Amount</Form.Label>
                      <Form.Control
                        type="number"
                        name="insuranceInfo.coverageAmount"
                        value={formData.insuranceInfo.coverageAmount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional notes about this payment..."
                  />
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/payments')}
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
                        {isEdit ? 'Update Payment' : 'Create Payment'}
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

export default PaymentForm;
