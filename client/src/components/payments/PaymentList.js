import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Modal, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/api';
import { format } from 'date-fns';

const PaymentList = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { paymentStatus: statusFilter }),
        ...(methodFilter && { paymentMethod: methodFilter })
      };
      
      // Use role-appropriate endpoint
      const endpoint = hasRole('patient') ? 'getMy' : 'getAll';
      const response = await paymentAPI[endpoint](params);
      setPayments(response.data.payments || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Error fetching payments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, methodFilter, hasRole]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentAPI.delete(id);
        toast.success('Payment deleted successfully');
        fetchPayments();
      } catch (error) {
        toast.error('Error deleting payment');
        console.error('Error:', error);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await paymentAPI.updateStatus(id, newStatus, user.id);
      toast.success('Payment status updated');
      fetchPayments();
    } catch (error) {
      toast.error('Error updating payment status');
      console.error('Error:', error);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPayment || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      await paymentAPI.processPayment(selectedPayment._id, {
        amount: paymentAmount,
        processedBy: user.id,
        notes: paymentNotes
      });
      toast.success('Payment processed successfully');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      fetchPayments();
    } catch (error) {
      toast.error('Error processing payment');
      console.error('Error:', error);
    }
  };

  const handleRefund = async (id) => {
    if (window.confirm('Are you sure you want to process a refund for this payment?')) {
      try {
        await paymentAPI.processRefund(id, user.id);
        toast.success('Refund processed successfully');
        fetchPayments();
      } catch (error) {
        toast.error('Error processing refund');
        console.error('Error:', error);
      }
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

  const canManagePayments = hasRole('superadmin') || hasRole('receptionist');
  const canProcessPayments = hasRole('superadmin') || hasRole('receptionist');
  const canDeletePayments = hasRole('superadmin');
  const canViewPayments = hasRole('patient') || canManagePayments;

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
            Payments Management
          </h2>
          <p className="text-muted">
            {hasRole('superadmin') && 'Complete payment management system'}
            {hasRole('receptionist') && 'Manage payments and processing workflow'}
            {hasRole('patient') && 'View and manage your payment history'}
          </p>
        </Col>
        {canManagePayments && (
          <Col className="text-end">
            <Button as={Link} to="/payments/new" variant="primary">
              <i className="fas fa-plus me-2"></i>
              Create New Payment
            </Button>
          </Col>
        )}
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Row>
              <Col md={3}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search payments by invoice, patient name, or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline-secondary" onClick={() => setCurrentPage(1)}>
                    <i className="fas fa-search me-1"></i>
                    Search
                  </Button>
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Overdue">Overdue</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="">All Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Check">Check</option>
                  <option value="Online Payment">Online Payment</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setMethodFilter('');
                    setCurrentPage(1);
                    fetchPayments();
                  }}
                >
                  <i className="fas fa-times me-1"></i>
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {payments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No payments found.
          {canManagePayments && (
            <div className="mt-2">
              <Button as={Link} to="/payments/new" variant="primary" size="sm">
                Create First Payment
              </Button>
            </div>
          )}
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Payments List ({payments.length} total)
                  </h5>
                </Col>
                <Col className="text-end">
                  <small className="text-muted">
                    Page {currentPage} of {totalPages}
                  </small>
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
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    {canManagePayments && (
                      <th>
                        <i className="fas fa-user-md me-1"></i>
                        Created By
                      </th>
                    )}
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
                      {canManagePayments && (
                        <td>
                          {payment.createdBy ? 
                            `${payment.createdBy.firstName} ${payment.createdBy.lastName}` : 
                            <span className="text-muted">Unknown</span>
                          }
                        </td>
                      )}
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
                            as={Link}
                            to={`/payments/${payment._id}`}
                            variant="outline-info"
                            size="sm"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          
                          {canManagePayments && (
                            <Button
                              as={Link}
                              to={`/payments/${payment._id}/edit`}
                              variant="outline-primary"
                              size="sm"
                              title="Edit Payment"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}

                          {payment.paymentStatus === 'Pending' && canProcessPayments && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setPaymentAmount(payment.amount);
                                setShowPaymentModal(true);
                              }}
                              title="Process Payment"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}

                          {payment.paymentStatus === 'Paid' && (
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <i className="fas fa-cog"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleRefund(payment._id)}>
                                  Process Refund
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(payment._id, 'Failed')}>
                                  Mark as Failed
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}

                          {canDeletePayments && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(payment._id)}
                              title="Delete Payment"
                            >
                              <i className="fas fa-trash"></i>
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

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Button
                variant="outline-primary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="me-2"
              >
                <i className="fas fa-chevron-left me-1"></i>
                Previous
              </Button>
              <span className="align-self-center mx-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline-primary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
                <i className="fas fa-chevron-right ms-1"></i>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Payment Processing Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-credit-card text-success me-2"></i>
            Process Payment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <div className="mb-4">
              <h6>Payment Information</h6>
              <p><strong>Invoice:</strong> {selectedPayment.invoiceNumber}</p>
              <p><strong>Patient:</strong> {selectedPayment.patientId?.firstName} {selectedPayment.patientId?.lastName}</p>
              <p><strong>Description:</strong> {selectedPayment.description}</p>
              <p><strong>Due Date:</strong> {format(new Date(selectedPayment.dueDate), 'MM/dd/yyyy')}</p>
              <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
              <hr />
              <h6>Amount Details</h6>
              <p><strong>Original Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
              {selectedPayment.taxAmount > 0 && (
                <p><strong>Tax:</strong> {formatCurrency(selectedPayment.taxAmount)}</p>
              )}
              {selectedPayment.discountAmount > 0 && (
                <p><strong>Discount:</strong> -{formatCurrency(selectedPayment.discountAmount)}</p>
              )}
              <p><strong>Total Amount:</strong> {formatCurrency(selectedPayment.totalAmount)}</p>
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Payment Amount *</Form.Label>
              <Form.Control
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                max={selectedPayment?.totalAmount || 0}
              />
              <Form.Text className="text-muted">
                Maximum: {formatCurrency(selectedPayment?.totalAmount || 0)}
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Payment Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleProcessPayment}
            disabled={paymentAmount <= 0}
          >
            <i className="fas fa-check me-1"></i>
            Process Payment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PaymentList;
