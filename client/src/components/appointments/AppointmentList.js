import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Modal, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentAPI } from '../../services/api';
import { format } from 'date-fns';

const AppointmentList = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      };
      
      // Use role-appropriate endpoint
      const endpoint = hasRole('patient') ? 'getMy' : 'getAll';
      const response = await appointmentAPI[endpoint](params);
      setAppointments(response.data.appointments || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Error fetching appointments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, hasRole]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentAPI.delete(id);
        toast.success('Appointment deleted successfully');
        fetchAppointments();
      } catch (error) {
        toast.error('Error deleting appointment');
        console.error('Error:', error);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentAPI.updateStatus(id, newStatus);
      toast.success('Appointment status updated');
      fetchAppointments();
    } catch (error) {
      toast.error('Error updating appointment status');
      console.error('Error:', error);
    }
  };

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
      fetchAppointments();
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
      fetchAppointments();
    } catch (error) {
      toast.error('Error rejecting appointment');
      console.error('Error:', error);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentAPI.updateStatus(id, 'Cancelled');
        toast.success('Appointment cancelled');
        fetchAppointments();
      } catch (error) {
        toast.error('Error cancelling appointment');
        console.error('Error:', error);
      }
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

  const canManageAppointments = hasRole('superadmin') || hasRole('receptionist');
  const canApproveAppointments = hasRole('superadmin') || hasRole('receptionist');
  const canDeleteAppointments = hasRole('superadmin');

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
            <i className="fas fa-calendar-alt me-2"></i>
            Appointments Management
          </h2>
          <p className="text-muted">
            {hasRole('superadmin') && 'Complete appointment management system'}
            {hasRole('receptionist') && 'Manage appointments and approval workflow'}
            {hasRole('patient') && 'View and manage your appointments'}
          </p>
        </Col>
        {canManageAppointments && (
          <Col className="text-end">
            <Button as={Link} to="/appointments/new" variant="primary">
              <i className="fas fa-calendar-plus me-2"></i>
              Schedule New Appointment
            </Button>
          </Col>
        )}
        {hasRole('patient') && (
          <Col className="text-end">
            <Button as={Link} to="/appointments/new" variant="primary">
              <i className="fas fa-calendar-plus me-2"></i>
              Book Appointment
            </Button>
          </Col>
        )}
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search appointments by patient name, type, or reason..."
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
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No Show">No Show</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setCurrentPage(1);
                    fetchAppointments();
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

      {appointments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No appointments found.
          {canManageAppointments && (
            <div className="mt-2">
              <Button as={Link} to="/appointments/new" variant="primary" size="sm">
                Schedule First Appointment
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
                    Appointments List ({appointments.length} total)
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
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    {canManageAppointments && (
                      <th>
                        <i className="fas fa-user-md me-1"></i>
                        Receptionist
                      </th>
                    )}
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
                      <i className="fas fa-info-circle me-1"></i>
                      Status
                    </th>
                    {appointments.some(apt => apt.homeCollection?.requested) && (
                      <th>
                        <i className="fas fa-home me-1"></i>
                        Home Collection
                      </th>
                    )}
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
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
                        </div>
                      </td>
                      {canManageAppointments && (
                        <td>
                          {appointment.receptionistId ? 
                            `${appointment.receptionistId.firstName} ${appointment.receptionistId.lastName}` : 
                            <span className="text-muted">Not assigned</span>
                          }
                        </td>
                      )}
                      <td>
                        <div>
                          <strong>{format(new Date(appointment.appointmentDate), 'MM/dd/yyyy')}</strong>
                          <div className="text-muted small">
                            {appointment.appointmentTime}
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
                      </td>
                      <td>
                        {getStatusBadge(appointment.status)}
                      </td>
                      {appointments.some(apt => apt.homeCollection?.requested) && (
                        <td>
                          {appointment.homeCollection?.requested ? (
                            <Badge bg={appointment.homeCollection.approved ? 'success' : 'warning'}>
                              {appointment.homeCollection.approved ? 'Approved' : 'Pending'}
                            </Badge>
                          ) : (
                            <span className="text-muted">No</span>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            as={Link}
                            to={`/appointments/${appointment._id}`}
                            variant="outline-info"
                            size="sm"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          
                          {canManageAppointments && (
                            <Button
                              as={Link}
                              to={`/appointments/${appointment._id}/edit`}
                              variant="outline-primary"
                              size="sm"
                              title="Edit Appointment"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}

                          {appointment.status === 'Pending' && canApproveAppointments && (
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
                                <Dropdown.Item onClick={() => handleCancel(appointment._id)}>
                                  Cancel Appointment
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}

                          {hasRole('patient') && appointment.status === 'Pending' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleCancel(appointment._id)}
                              title="Cancel Appointment"
                            >
                              <i className="fas fa-ban"></i>
                            </Button>
                          )}

                          {canDeleteAppointments && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(appointment._id)}
                              title="Delete Appointment"
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

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-check-circle text-success me-2"></i>
            Approve Appointment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div className="mb-3">
              <p><strong>Patient:</strong> {selectedAppointment.patientId?.firstName} {selectedAppointment.patientId?.lastName}</p>
              <p><strong>Date:</strong> {format(new Date(selectedAppointment.appointmentDate), 'MM/dd/yyyy')}</p>
              <p><strong>Time:</strong> {selectedAppointment.appointmentTime}</p>
              <p><strong>Type:</strong> {selectedAppointment.type}</p>
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
      <Modal show={showRejectionModal} onHide={() => setShowRejectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-times-circle text-danger me-2"></i>
            Reject Appointment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAppointment && (
            <div className="mb-3">
              <p><strong>Patient:</strong> {selectedAppointment.patientId?.firstName} {selectedAppointment.patientId?.lastName}</p>
              <p><strong>Date:</strong> {format(new Date(selectedAppointment.appointmentDate), 'MM/dd/yyyy')}</p>
              <p><strong>Time:</strong> {selectedAppointment.appointmentTime}</p>
              <p><strong>Type:</strong> {selectedAppointment.type}</p>
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

export default AppointmentList;
