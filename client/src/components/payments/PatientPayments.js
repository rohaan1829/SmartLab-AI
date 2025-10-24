import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/api';
import { format } from 'date-fns';

const PatientPayments = () => {
  const { user, hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchPatientPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getMy();
      setPayments(response.data);
    } catch (error) {
      toast.error('Error fetching your payments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientPayments();
  }, [fetchPatientPayments]);

  const handleMakePayment = async (paymentData) => {
    try {
      await paymentAPI.makePayment(selectedPayment._id, paymentData);
      toast.success('Payment submitted successfully');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      fetchPatientPayments();
    } catch (error) {
      toast.error('Error submitting payment');
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

  const canViewPayments = hasRole('patient');

  if (!canViewPayments) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to view patient payments.</p>
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

  const filteredPayments = payments.filter(payment => 
    filterStatus === 'All' || payment.paymentStatus === filterStatus
  );

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-credit-card me-2"></i>
            My Payments
          </h2>
          <p className="text-muted">
            View and manage your payment history
          </p>
        </Col>
        <Col className="text-end">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
            <option value="Overdue">Overdue</option>
          </Form.Select>
        </Col>
      </Row>

      {filteredPayments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No payments found with the selected filter.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Payments ({filteredPayments.length} total)
                  </h5>
                </Col>
                <Col className="text-end">
                  <Badge bg="warning" className="me-2">
                    {payments.filter(p => p.paymentStatus === 'Pending').length} Pending
                  </Badge>
                  <Badge bg="success">
                    {payments.filter(p => p.paymentStatus === 'Paid').length} Paid
                  </Badge>
                </Col>
              </Row>
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
                      <i className="fas fa-calendar-check me-1"></i>
                      Payment Date
                    </th>
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
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
                        {payment.processedBy && (
                          <div className="text-muted small mt-1">
                            Processed by: {payment.processedBy.firstName} {payment.processedBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>
                          <strong>{format(new Date(payment.dueDate), 'MM/dd/yyyy')}</strong>
                          {new Date(payment.dueDate) < new Date() && payment.paymentStatus === 'Pending' && (
                            <div className="text-danger small">
                              Overdue
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {payment.paymentDate ? 
                          <div>
                            <strong>{format(new Date(payment.paymentDate), 'MM/dd/yyyy')}</strong>
                            <div className="text-muted small">
                              {format(new Date(payment.paymentDate), 'HH:mm')}
                            </div>
                          </div> : 
                          <span className="text-muted">-</span>
                        }
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentModal(true);
                            }}
                            title="View Payment Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>

                          {payment.paymentStatus === 'Pending' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowPaymentModal(true);
                              }}
                              title="Make Payment"
                            >
                              <i className="fas fa-credit-card"></i>
                            </Button>
                          )}

                          {payment.paymentStatus === 'Paid' && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled
                              title="Payment Completed"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}
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

      {/* Payment Details Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-file-invoice text-primary me-2"></i>
            Payment Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Payment Information</h6>
                  <p><strong>Invoice:</strong> {selectedPayment.invoiceNumber}</p>
                  <p><strong>Description:</strong> {selectedPayment.description}</p>
                  <p><strong>Due Date:</strong> {format(new Date(selectedPayment.dueDate), 'MM/dd/yyyy')}</p>
                  <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedPayment.paymentStatus)}</p>
                </Col>
                <Col md={6}>
                  <h6>Amount Details</h6>
                  <p><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                  {selectedPayment.taxAmount > 0 && (
                    <p><strong>Tax:</strong> {formatCurrency(selectedPayment.taxAmount)}</p>
                  )}
                  {selectedPayment.discountAmount > 0 && (
                    <p><strong>Discount:</strong> -{formatCurrency(selectedPayment.discountAmount)}</p>
                  )}
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedPayment.totalAmount)}</p>
                  {selectedPayment.paymentDate && (
                    <p><strong>Payment Date:</strong> {format(new Date(selectedPayment.paymentDate), 'MM/dd/yyyy HH:mm')}</p>
                  )}
                </Col>
              </Row>

              {selectedPayment.items && selectedPayment.items.length > 0 && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Payment Items</h6>
                    <div className="border p-2 rounded bg-light">
                      <Table size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPayment.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.description}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.unitPrice)}</td>
                              <td>{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedPayment.insuranceInfo && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Insurance Information</h6>
                    <div className="border p-2 rounded bg-light">
                      <p><strong>Provider:</strong> {selectedPayment.insuranceInfo.provider}</p>
                      <p><strong>Policy Number:</strong> {selectedPayment.insuranceInfo.policyNumber}</p>
                      <p><strong>Claim Number:</strong> {selectedPayment.insuranceInfo.claimNumber}</p>
                      <p><strong>Coverage Amount:</strong> {formatCurrency(selectedPayment.insuranceInfo.coverageAmount)}</p>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedPayment.notes && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Notes</h6>
                    <div className="border p-2 rounded bg-light">
                      <p>{selectedPayment.notes}</p>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedPayment.paymentStatus === 'Pending' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Payment Required:</strong> This payment is pending. 
                      Please contact our office to make payment arrangements.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedPayment.paymentStatus === 'Paid' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="success">
                      <i className="fas fa-check-circle me-2"></i>
                      <strong>Payment Completed:</strong> This payment has been successfully processed.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedPayment.paymentStatus === 'Failed' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="danger">
                      <i className="fas fa-times-circle me-2"></i>
                      <strong>Payment Failed:</strong> This payment could not be processed. 
                      Please contact our office for assistance.
                    </Alert>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Close
          </Button>
          {selectedPayment?.paymentStatus === 'Pending' && (
            <Button 
              variant="success" 
              onClick={() => {
                toast.info('Payment processing feature coming soon. Please contact our office.');
                setShowPaymentModal(false);
              }}
            >
              <i className="fas fa-credit-card me-1"></i>
              Make Payment
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PatientPayments;
