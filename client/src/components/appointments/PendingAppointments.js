import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal, Dropdown } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentAPI } from '../../services/api';
import { format } from 'date-fns';

const PendingAppointments = () => {
  const { user, hasRole } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending');

  const fetchPendingAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getPending();
      setAppointments(response.data);
    } catch (error) {
      toast.error('Error fetching pending appointments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingAppointments();
  }, [fetchPendingAppointments]);

  const handleApprove = async () => {
    if (!selectedAppointment) return;
    
    try {
      await appointmentAPI.approve(selectedAppointment._id, {
        approvalNotes,
        receptionistId: user.id
      });
      toast.success('Appointment approved successfully');
      setShowApprovalModal(false);
      setSelectedAppointment(null);
      setApprovalNotes('');
      fetchPendingAppointments();
    } catch (error) {
      toast.error('Error approving appointment');
      console.error('Error:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedAppointment) return;
    
    try {
      await appointmentAPI.reject(selectedAppointment._id, {
        rejectionReason,
        receptionistId: user.id
      });
      toast.success('Appointment rejected');
      setShowRejectionModal(false);
      setSelectedAppointment(null);
      setRejectionReason('');
      fetchPendingAppointments();
    } catch (error) {
      toast.error('Error rejecting appointment');
      console.error('Error:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentAPI.updateStatus(id, newStatus);
      toast.success('Appointment status updated');
      fetchPendingAppointments();
    } catch (error) {
      toast.error('Error updating appointment status');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Pending': 'warning',
      'Approved': 'success',
      'Rejected': 'danger',
      'Completed': 'info',
      'Cancelled': 'secondary',
      'No Show': 'dark'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const canApproveAppointments = hasRole('superadmin') || hasRole('receptionist');

  if (!canApproveAppointments) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to approve appointments.</p>
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

  const filteredAppointments = appointments.filter(apt => 
    filterStatus === 'All' || apt.status === filterStatus
  );

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-clock me-2"></i>
            Pending Appointments
          </h2>
          <p className="text-muted">
            Review and approve/reject appointment requests from patients
          </p>
        </Col>
        <Col className="text-end">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="Pending">Pending Only</option>
            <option value="Approved">Approved Only</option>
            <option value="Rejected">Rejected Only</option>
            <option value="All">All Statuses</option>
          </Form.Select>
        </Col>
      </Row>

      {filteredAppointments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No appointments found with the selected filter.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Appointments ({filteredAppointments.length} total)
                  </h5>
                </Col>
                <Col className="text-end">
                  <Badge bg="warning" className="me-2">
                    {appointments.filter(apt => apt.status === 'Pending').length} Pending
                  </Badge>
                  <Badge bg="success">
                    {appointments.filter(apt => apt.status === 'Approved').length} Approved
                  </Badge>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    <th>
                      <i className="fas fa-calendar me-1"></i>
                      Date & Time
                    </th>
                    <th>
                      <i className="fas fa-stethoscope me-1"></i>
                      Type
                    </th>
                    <th>
                      <i className="fas fa-comment me-1"></i>
                      Reason
                    </th>
                    <th>
                      <i className="fas fa-home me-1"></i>
                      Home Collection
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-1"></i>
                      Status
                    </th>
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment._id}>
                      <td>
                        <div>
                          <strong>
                            {appointment.patientId ? 
                              `${appointment.patientId.firstName} ${appointment.patientId.lastName}` : 
                              'N/A'
                            }
                          </strong>
                          {appointment.patientId?.email && (
                            <div className="text-muted small">
                              {appointment.patientId.email}
                            </div>
                          )}
                          {appointment.patientId?.phone && (
                            <div className="text-muted small">
                              <i className="fas fa-phone me-1"></i>
                              {appointment.patientId.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{format(new Date(appointment.appointmentDate), 'MM/dd/yyyy')}</strong>
                          <div className="text-muted small">
                            {appointment.appointmentTime}
                          </div>
                          <div className="text-muted small">
                            Duration: {appointment.duration} min
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge bg="info">{appointment.type}</Badge>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={appointment.reason}>
                          {appointment.reason}
                        </div>
                        {appointment.notes && (
                          <div className="text-muted small mt-1">
                            <i className="fas fa-sticky-note me-1"></i>
                            {appointment.notes.substring(0, 50)}...
                          </div>
                        )}
                      </td>
                      <td>
                        {appointment.homeCollection?.requested ? (
                          <div>
                            <Badge bg="warning">Requested</Badge>
                            <div className="text-muted small mt-1">
                              <i className="fas fa-map-marker-alt me-1"></i>
                              {appointment.homeCollection.address?.substring(0, 30)}...
                            </div>
                            <div className="text-muted small">
                              <i className="fas fa-phone me-1"></i>
                              {appointment.homeCollection.contactPhone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(appointment.status)}
                        {appointment.approvedBy && (
                          <div className="text-muted small mt-1">
                            Approved by: {appointment.approvedBy.firstName} {appointment.approvedBy.lastName}
                          </div>
                        )}
                        {appointment.rejectedBy && (
                          <div className="text-muted small mt-1">
                            Rejected by: {appointment.rejectedBy.firstName} {appointment.rejectedBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {appointment.status === 'Pending' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowApprovalModal(true);
                                }}
                                title="Approve Appointment"
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowRejectionModal(true);
                                }}
                                title="Reject Appointment"
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          )}

                          {appointment.status === 'Approved' && (
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <i className="fas fa-cog"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleStatusChange(appointment._id, 'Completed')}>
                                  Mark as Completed
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(appointment._id, 'No Show')}>
                                  Mark as No Show
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(appointment._id, 'Cancelled')}>
                                  Cancel Appointment
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}

                          {appointment.homeCollection?.requested && !appointment.homeCollection.approved && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              title="Approve Home Collection"
                              onClick={() => {
                                // This would open a modal for home collection approval
                                toast.info('Home collection approval feature coming soon');
                              }}
                            >
                              <i className="fas fa-home"></i>
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

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-check-circle text-success me-2"></i>
            Approve Appointment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Patient Information</h6>
                  <p><strong>Name:</strong> {selectedAppointment.patientId?.firstName} {selectedAppointment.patientId?.lastName}</p>
                  <p><strong>Email:</strong> {selectedAppointment.patientId?.email}</p>
                  <p><strong>Phone:</strong> {selectedAppointment.patientId?.phone}</p>
                </Col>
                <Col md={6}>
                  <h6>Appointment Details</h6>
                  <p><strong>Date:</strong> {format(new Date(selectedAppointment.appointmentDate), 'MM/dd/yyyy')}</p>
                  <p><strong>Time:</strong> {selectedAppointment.appointmentTime}</p>
                  <p><strong>Type:</strong> {selectedAppointment.type}</p>
                  <p><strong>Duration:</strong> {selectedAppointment.duration} minutes</p>
                </Col>
              </Row>
              
              <Row className="mt-3">
                <Col md={12}>
                  <h6>Reason for Appointment</h6>
                  <p className="border p-2 rounded bg-light">{selectedAppointment.reason}</p>
                </Col>
              </Row>

              {selectedAppointment.notes && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Additional Notes</h6>
                    <p className="border p-2 rounded bg-light">{selectedAppointment.notes}</p>
                  </Col>
                </Row>
              )}

              {selectedAppointment.homeCollection?.requested && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Home Collection Request</h6>
                    <div className="border p-2 rounded bg-light">
                      <p><strong>Address:</strong> {selectedAppointment.homeCollection.address}</p>
                      <p><strong>Contact Phone:</strong> {selectedAppointment.homeCollection.contactPhone}</p>
                      {selectedAppointment.homeCollection.preferredTime && (
                        <p><strong>Preferred Time:</strong> {selectedAppointment.homeCollection.preferredTime}</p>
                      )}
                      {selectedAppointment.homeCollection.specialInstructions && (
                        <p><strong>Special Instructions:</strong> {selectedAppointment.homeCollection.specialInstructions}</p>
                      )}
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          )}
          
          <Form.Group>
            <Form.Label>Approval Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove}>
            <i className="fas fa-check me-1"></i>
            Approve Appointment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rejection Modal */}
      <Modal show={showRejectionModal} onHide={() => setShowRejectionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-times-circle text-danger me-2"></i>
            Reject Appointment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Patient Information</h6>
                  <p><strong>Name:</strong> {selectedAppointment.patientId?.firstName} {selectedAppointment.patientId?.lastName}</p>
                  <p><strong>Email:</strong> {selectedAppointment.patientId?.email}</p>
                  <p><strong>Phone:</strong> {selectedAppointment.patientId?.phone}</p>
                </Col>
                <Col md={6}>
                  <h6>Appointment Details</h6>
                  <p><strong>Date:</strong> {format(new Date(selectedAppointment.appointmentDate), 'MM/dd/yyyy')}</p>
                  <p><strong>Time:</strong> {selectedAppointment.appointmentTime}</p>
                  <p><strong>Type:</strong> {selectedAppointment.type}</p>
                </Col>
              </Row>
              
              <Row className="mt-3">
                <Col md={12}>
                  <h6>Reason for Appointment</h6>
                  <p className="border p-2 rounded bg-light">{selectedAppointment.reason}</p>
                </Col>
              </Row>
            </div>
          )}
          
          <Form.Group>
            <Form.Label>Rejection Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this appointment..."
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleReject}
            disabled={!rejectionReason.trim()}
          >
            <i className="fas fa-times me-1"></i>
            Reject Appointment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingAppointments;
