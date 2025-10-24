import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/api';
import { format } from 'date-fns';

const RefundManagement = () => {
  const { user, hasRole } = useAuth();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [refundData, setRefundData] = useState({
    refundAmount: '',
    refundReason: '',
    refundMethod: 'Original Payment Method',
    notes: ''
  });

  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAll({ 
        includeRefunds: true,
        limit: 1000 
      });
      const refundsData = response.data.filter(payment => 
        payment.refundStatus && payment.refundStatus !== 'None'
      );
      setRefunds(refundsData);
    } catch (error) {
      toast.error('Error fetching refunds');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleRefundSubmit = async () => {
    if (!selectedRefund) return;

    try {
      await paymentAPI.processRefund(selectedRefund._id, {
        ...refundData,
        refundAmount: parseFloat(refundData.refundAmount),
        processedBy: user.id
      });
      toast.success('Refund processed successfully');
      setShowRefundModal(false);
      setSelectedRefund(null);
      setRefundData({
        refundAmount: '',
        refundReason: '',
        refundMethod: 'Original Payment Method',
        notes: ''
      });
      fetchRefunds();
    } catch (error) {
      toast.error('Error processing refund');
      console.error('Error:', error);
    }
  };

  const handleRefundApproval = async (paymentId, approved) => {
    try {
      await paymentAPI.updateRefundStatus(paymentId, approved ? 'Approved' : 'Rejected', user.id);
      toast.success(`Refund ${approved ? 'approved' : 'rejected'} successfully`);
      fetchRefunds();
    } catch (error) {
      toast.error('Error updating refund status');
      console.error('Error:', error);
    }
  };

  const getRefundStatusBadge = (status) => {
    const statusColors = {
      'Requested': 'warning',
      'Approved': 'success',
      'Rejected': 'danger',
      'Processed': 'info',
      'Failed': 'dark'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
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

  const canManageRefunds = hasRole('superadmin') || hasRole('receptionist');

  if (!canManageRefunds) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to manage refunds.</p>
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

  const filteredRefunds = refunds.filter(refund => 
    filterStatus === 'All' || refund.refundStatus === filterStatus
  );

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-undo me-2"></i>
            Refund Management
          </h2>
          <p className="text-muted">
            Manage payment refunds and process refund requests
          </p>
        </Col>
        <Col className="text-end">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="All">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Processed">Processed</option>
            <option value="Failed">Failed</option>
          </Form.Select>
        </Col>
      </Row>

      {filteredRefunds.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No refunds found with the selected filter.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Refunds ({filteredRefunds.length} total)
                  </h5>
                </Col>
                <Col className="text-end">
                  <Badge bg="warning" className="me-2">
                    {refunds.filter(r => r.refundStatus === 'Requested').length} Requested
                  </Badge>
                  <Badge bg="success">
                    {refunds.filter(r => r.refundStatus === 'Processed').length} Processed
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
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    <th>
                      <i className="fas fa-dollar-sign me-1"></i>
                      Amount
                    </th>
                    <th>
                      <i className="fas fa-undo me-1"></i>
                      Refund Status
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-1"></i>
                      Payment Status
                    </th>
                    <th>
                      <i className="fas fa-calendar me-1"></i>
                      Request Date
                    </th>
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((refund) => (
                    <tr key={refund._id}>
                      <td>
                        <div>
                          <strong>{refund.invoiceNumber}</strong>
                          {refund.description && (
                            <div className="text-muted small">
                              {refund.description.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>
                            {refund.patientId ? 
                              `${refund.patientId.firstName} ${refund.patientId.lastName}` : 
                              'N/A'
                            }
                          </strong>
                          {refund.patientId?.email && (
                            <div className="text-muted small">
                              {refund.patientId.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{formatCurrency(refund.amount)}</strong>
                          {refund.refundAmount && refund.refundAmount !== refund.amount && (
                            <div className="text-muted small">
                              Refund: {formatCurrency(refund.refundAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {getRefundStatusBadge(refund.refundStatus)}
                        {refund.refundProcessedBy && (
                          <div className="text-muted small mt-1">
                            Processed by: {refund.refundProcessedBy.firstName} {refund.refundProcessedBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        {getPaymentStatusBadge(refund.paymentStatus)}
                      </td>
                      <td>
                        {refund.refundRequestDate ? 
                          <div>
                            <strong>{format(new Date(refund.refundRequestDate), 'MM/dd/yyyy')}</strong>
                            <div className="text-muted small">
                              {format(new Date(refund.refundRequestDate), 'HH:mm')}
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
                              setSelectedRefund(refund);
                              setShowRefundModal(true);
                            }}
                            title="View Refund Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>

                          {refund.refundStatus === 'Requested' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleRefundApproval(refund._id, true)}
                                title="Approve Refund"
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRefundApproval(refund._id, false)}
                                title="Reject Refund"
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          )}

                          {refund.refundStatus === 'Approved' && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setRefundData({
                                  refundAmount: refund.refundAmount || refund.amount,
                                  refundReason: refund.refundReason || '',
                                  refundMethod: refund.refundMethod || 'Original Payment Method',
                                  notes: refund.refundNotes || ''
                                });
                                setShowRefundModal(true);
                              }}
                              title="Process Refund"
                            >
                              <i className="fas fa-credit-card"></i>
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

      {/* Refund Details Modal */}
      <Modal show={showRefundModal} onHide={() => setShowRefundModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-undo text-warning me-2"></i>
            Refund Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRefund && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Payment Information</h6>
                  <p><strong>Invoice:</strong> {selectedRefund.invoiceNumber}</p>
                  <p><strong>Description:</strong> {selectedRefund.description}</p>
                  <p><strong>Payment Method:</strong> {selectedRefund.paymentMethod}</p>
                  <p><strong>Payment Status:</strong> {getPaymentStatusBadge(selectedRefund.paymentStatus)}</p>
                  <p><strong>Payment Date:</strong> {selectedRefund.paymentDate ? format(new Date(selectedRefund.paymentDate), 'MM/dd/yyyy') : 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <h6>Refund Information</h6>
                  <p><strong>Refund Status:</strong> {getRefundStatusBadge(selectedRefund.refundStatus)}</p>
                  <p><strong>Refund Amount:</strong> {formatCurrency(selectedRefund.refundAmount || selectedRefund.amount)}</p>
                  <p><strong>Refund Reason:</strong> {selectedRefund.refundReason || 'N/A'}</p>
                  <p><strong>Refund Method:</strong> {selectedRefund.refundMethod || 'N/A'}</p>
                  <p><strong>Request Date:</strong> {selectedRefund.refundRequestDate ? format(new Date(selectedRefund.refundRequestDate), 'MM/dd/yyyy') : 'N/A'}</p>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col md={12}>
                  <h6>Patient Information</h6>
                  <div className="border p-2 rounded bg-light">
                    <p><strong>Name:</strong> {selectedRefund.patientId?.firstName} {selectedRefund.patientId?.lastName}</p>
                    <p><strong>Email:</strong> {selectedRefund.patientId?.email}</p>
                    <p><strong>Phone:</strong> {selectedRefund.patientId?.phone}</p>
                  </div>
                </Col>
              </Row>

              {selectedRefund.refundNotes && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Refund Notes</h6>
                    <div className="border p-2 rounded bg-light">
                      <p>{selectedRefund.refundNotes}</p>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedRefund.refundStatus === 'Requested' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Refund Requested:</strong> This refund is awaiting approval.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedRefund.refundStatus === 'Approved' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="success">
                      <i className="fas fa-check-circle me-2"></i>
                      <strong>Refund Approved:</strong> This refund has been approved and is ready for processing.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedRefund.refundStatus === 'Processed' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="info">
                      <i className="fas fa-check-double me-2"></i>
                      <strong>Refund Processed:</strong> This refund has been successfully processed.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedRefund.refundStatus === 'Rejected' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="danger">
                      <i className="fas fa-times-circle me-2"></i>
                      <strong>Refund Rejected:</strong> This refund request has been rejected.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedRefund.refundStatus === 'Approved' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Process Refund</h6>
                    <Form>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Refund Amount *</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              max={selectedRefund.amount}
                              value={refundData.refundAmount}
                              onChange={(e) => setRefundData(prev => ({ ...prev, refundAmount: e.target.value }))}
                              placeholder="Enter refund amount"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Refund Method</Form.Label>
                            <Form.Select
                              value={refundData.refundMethod}
                              onChange={(e) => setRefundData(prev => ({ ...prev, refundMethod: e.target.value }))}
                            >
                              <option value="Original Payment Method">Original Payment Method</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Check">Check</option>
                              <option value="Cash">Cash</option>
                              <option value="Credit to Account">Credit to Account</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Processing Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={refundData.notes}
                          onChange={(e) => setRefundData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add any processing notes..."
                        />
                      </Form.Group>
                    </Form>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefundModal(false)}>
            Close
          </Button>
          {selectedRefund?.refundStatus === 'Approved' && (
            <Button 
              variant="success" 
              onClick={handleRefundSubmit}
              disabled={!refundData.refundAmount || parseFloat(refundData.refundAmount) <= 0}
            >
              <i className="fas fa-credit-card me-1"></i>
              Process Refund
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RefundManagement;