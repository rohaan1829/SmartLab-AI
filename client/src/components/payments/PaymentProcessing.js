import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/api';
import { format } from 'date-fns';

const PaymentProcessing = () => {
  const { user, hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processingData, setProcessingData] = useState({
    amount: 0,
    paymentMethod: '',
    transactionId: '',
    processingNotes: '',
    receiptNumber: ''
  });

  const fetchPendingPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAll({ paymentStatus: 'Pending' });
      setPayments(response.data.payments || response.data);
    } catch (error) {
      toast.error('Error fetching pending payments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  const handleProcessPayment = async () => {
    if (!selectedPayment || !processingData.amount || !processingData.paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await paymentAPI.processPayment(selectedPayment._id, {
        ...processingData,
        processedBy: user.id,
        processedAt: new Date().toISOString()
      });
      toast.success('Payment processed successfully');
      setShowProcessingModal(false);
      setSelectedPayment(null);
      setProcessingData({
        amount: 0,
        paymentMethod: '',
        transactionId: '',
        processingNotes: '',
        receiptNumber: ''
      });
      fetchPendingPayments();
    } catch (error) {
      toast.error('Error processing payment');
      console.error('Error:', error);
    }
  };

  const handleRejectPayment = async (id, reason) => {
    try {
      await paymentAPI.updateStatus(id, 'Failed', user.id);
      toast.success('Payment rejected');
      fetchPendingPayments();
    } catch (error) {
      toast.error('Error rejecting payment');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Pending': 'warning',
      'Paid': 'success',
      'Failed': 'danger',
      'Refunded': 'info',
      'Partially Paid': 'primary',
      'Overdue': 'dark'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const canProcessPayments = hasRole('superadmin') || hasRole('receptionist');

  if (!canProcessPayments) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to process payments.</p>
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-credit-card me-2"></i>
            Payment Processing
          </h2>
          <p className="text-muted">
            Process pending payments and manage payment transactions
          </p>
        </Col>
        <Col className="text-end">
          <Badge bg="warning" className="me-2">
            {payments.length} Pending Payments
          </Badge>
        </Col>
      </Row>

      {payments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No pending payments found.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Pending Payments ({payments.length} total)
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>
                      <i className="fas fa-file-invoice me-1"></i>
                      Invoice #
                    </th>
                    <th>
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    <th>
                      <i className="fas fa-dollar-sign me-1"></i>
                      Amount
                    </th>
                    <th>
                      <i className="fas fa-credit-card me-1"></i>
                      Method
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-1"></i>
                      Status
                    </th>
                    <th>
                      <i className="fas fa-calendar me-1"></i>
                      Due Date
                    </th>
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <div>
                          <strong>{payment.invoiceNumber}</strong>
                          {payment.description && (
                            <div className="text-muted small">
                              {payment.description.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>
                            {payment.patientId ? 
                              `${payment.patientId.firstName} ${payment.patientId.lastName}` : 
                              'N/A'
                            }
                          </strong>
                          {payment.patientId?.email && (
                            <div className="text-muted small">
                              {payment.patientId.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{formatCurrency(payment.amount)}</strong>
                          {payment.totalAmount !== payment.amount && (
                            <div className="text-muted small">
                              Total: {formatCurrency(payment.totalAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg="info">{payment.paymentMethod}</Badge>
                      </td>
                      <td>
                        {getStatusBadge(payment.paymentStatus)}
                      </td>
                      <td>
                        <div>
                          <strong>{format(new Date(payment.dueDate), 'MM/dd/yyyy')}</strong>
                          {new Date(payment.dueDate) < new Date() && (
                            <div className="text-danger small">
                              Overdue
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setProcessingData({
                                amount: payment.amount,
                                paymentMethod: payment.paymentMethod,
                                transactionId: '',
                                processingNotes: '',
                                receiptNumber: ''
                              });
                              setShowProcessingModal(true);
                            }}
                            title="Process Payment"
                          >
                            <i className="fas fa-check"></i>
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              const reason = prompt('Please provide a reason for rejection:');
                              if (reason) {
                                handleRejectPayment(payment._id, reason);
                              }
                            }}
                            title="Reject Payment"
                          >
                            <i className="fas fa-times"></i>
                          </Button>

                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => {
                              // This would open a detailed view modal
                              toast.info('Detailed view feature coming soon');
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Payment Processing Modal */}
      <Modal show={showProcessingModal} onHide={() => setShowProcessingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-credit-card text-success me-2"></i>
            Process Payment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Payment Information</h6>
                  <p><strong>Invoice:</strong> {selectedPayment.invoiceNumber}</p>
                  <p><strong>Patient:</strong> {selectedPayment.patientId?.firstName} {selectedPayment.patientId?.lastName}</p>
                  <p><strong>Description:</strong> {selectedPayment.description}</p>
                  <p><strong>Due Date:</strong> {format(new Date(selectedPayment.dueDate), 'MM/dd/yyyy')}</p>
                </Col>
                <Col md={6}>
                  <h6>Amount Details</h6>
                  <p><strong>Original Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                  {selectedPayment.taxAmount > 0 && (
                    <p><strong>Tax:</strong> {formatCurrency(selectedPayment.taxAmount)}</p>
                  )}
                  {selectedPayment.discountAmount > 0 && (
                    <p><strong>Discount:</strong> -{formatCurrency(selectedPayment.discountAmount)}</p>
                  )}
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedPayment.totalAmount)}</p>
                </Col>
              </Row>
              <hr />
            </div>
          )}
          
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Amount *</Form.Label>
                  <Form.Control
                    type="number"
                    value={processingData.amount}
                    onChange={(e) => setProcessingData(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    min="0"
                    step="0.01"
                    max={selectedPayment?.totalAmount || 0}
                  />
                  <Form.Text className="text-muted">
                    Maximum: {formatCurrency(selectedPayment?.totalAmount || 0)}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method *</Form.Label>
                  <Form.Select
                    value={processingData.paymentMethod}
                    onChange={(e) => setProcessingData(prev => ({ 
                      ...prev, 
                      paymentMethod: e.target.value 
                    }))}
                  >
                    <option value="">Select Method</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Online Payment">Online Payment</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Transaction ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={processingData.transactionId}
                    onChange={(e) => setProcessingData(prev => ({ 
                      ...prev, 
                      transactionId: e.target.value 
                    }))}
                    placeholder="Transaction reference number..."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Receipt Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={processingData.receiptNumber}
                    onChange={(e) => setProcessingData(prev => ({ 
                      ...prev, 
                      receiptNumber: e.target.value 
                    }))}
                    placeholder="Receipt number..."
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Processing Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={processingData.processingNotes}
                onChange={(e) => setProcessingData(prev => ({ 
                  ...prev, 
                  processingNotes: e.target.value 
                }))}
                placeholder="Add any notes about this payment processing..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProcessingModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleProcessPayment}
            disabled={!processingData.amount || !processingData.paymentMethod}
          >
            <i className="fas fa-check me-1"></i>
            Process Payment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PaymentProcessing;
