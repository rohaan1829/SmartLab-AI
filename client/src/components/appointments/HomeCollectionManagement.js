import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentAPI } from '../../services/api';
import { format } from 'date-fns';

const HomeCollectionManagement = () => {
  const { user, hasRole } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [approvalData, setApprovalData] = useState({
    approved: true,
    collectionDate: '',
    collectionTime: '',
    assignedCollector: '',
    notes: ''
  });

  const fetchHomeCollectionRequests = useCallback(async () => {
    try {
      setLoading(true);
      // Get all appointments and filter for home collection requests
      const response = await appointmentAPI.getAll({ limit: 1000 });
      const homeCollectionAppointments = response.data.appointments.filter(
        apt => apt.homeCollection?.requested
      );
      setAppointments(homeCollectionAppointments);
    } catch (error) {
      toast.error('Error fetching home collection requests');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeCollectionRequests();
  }, [fetchHomeCollectionRequests]);

  const handleApproveHomeCollection = async () => {
    if (!selectedAppointment) return;
    
    try {
      await appointmentAPI.approveHomeCollection(selectedAppointment._id, {
        ...approvalData,
        approvedBy: user.id
      });
      toast.success('Home collection request processed successfully');
      setShowApprovalModal(false);
      setSelectedAppointment(null);
      setApprovalData({
        approved: true,
        collectionDate: '',
        collectionTime: '',
        assignedCollector: '',
        notes: ''
      });
      fetchHomeCollectionRequests();
    } catch (error) {
      toast.error('Error processing home collection request');
      console.error('Error:', error);
    }
  };

  const handleRejectHomeCollection = async () => {
    if (!selectedAppointment) return;
    
    try {
      await appointmentAPI.approveHomeCollection(selectedAppointment._id, {
        approved: false,
        notes: approvalData.notes,
        approvedBy: user.id
      });
      toast.success('Home collection request rejected');
      setShowApprovalModal(false);
      setSelectedAppointment(null);
      setApprovalData({
        approved: true,
        collectionDate: '',
        collectionTime: '',
        assignedCollector: '',
        notes: ''
      });
      fetchHomeCollectionRequests();
    } catch (error) {
      toast.error('Error rejecting home collection request');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (appointment) => {
    if (!appointment.homeCollection?.requested) {
      return <Badge bg="secondary">No Request</Badge>;
    }
    
    if (appointment.homeCollection.approved === true) {
      return <Badge bg="success">Approved</Badge>;
    } else if (appointment.homeCollection.approved === false) {
      return <Badge bg="danger">Rejected</Badge>;
    } else {
      return <Badge bg="warning">Pending</Badge>;
    }
  };

  const canManageHomeCollection = hasRole('superadmin') || hasRole('receptionist');

  if (!canManageHomeCollection) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to manage home collection requests.</p>
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

  const pendingRequests = appointments.filter(apt => 
    apt.homeCollection?.requested && apt.homeCollection.approved === undefined
  );

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-home me-2"></i>
            Home Collection Management
          </h2>
          <p className="text-muted">
            Manage home sample collection requests from patients
          </p>
        </Col>
        <Col className="text-end">
          <Badge bg="warning" className="me-2">
            {pendingRequests.length} Pending
          </Badge>
          <Badge bg="success">
            {appointments.filter(apt => apt.homeCollection?.approved === true).length} Approved
          </Badge>
        </Col>
      </Row>

      {appointments.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No home collection requests found.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Home Collection Requests ({appointments.length} total)
                  </h5>
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
                      Appointment
                    </th>
                    <th>
                      <i className="fas fa-map-marker-alt me-1"></i>
                      Collection Address
                    </th>
                    <th>
                      <i className="fas fa-phone me-1"></i>
                      Contact Info
                    </th>
                    <th>
                      <i className="fas fa-clock me-1"></i>
                      Preferred Time
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
                      <td>
                        <div>
                          <strong>{format(new Date(appointment.appointmentDate), 'MM/dd/yyyy')}</strong>
                          <div className="text-muted small">
                            {appointment.appointmentTime}
                          </div>
                          <Badge bg="info" className="mt-1">{appointment.type}</Badge>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{appointment.homeCollection.address}</strong>
                          {appointment.homeCollection.specialInstructions && (
                            <div className="text-muted small mt-1">
                              <i className="fas fa-info-circle me-1"></i>
                              {appointment.homeCollection.specialInstructions}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>
                            <i className="fas fa-phone me-1"></i>
                            {appointment.homeCollection.contactPhone}
                          </div>
                          {appointment.patientId?.phone && (
                            <div className="text-muted small">
                              <i className="fas fa-mobile-alt me-1"></i>
                              {appointment.patientId.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {appointment.homeCollection.preferredTime ? (
                          <div>
                            <i className="fas fa-clock me-1"></i>
                            {appointment.homeCollection.preferredTime}
                          </div>
                        ) : (
                          <span className="text-muted">Not specified</span>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(appointment)}
                        {appointment.homeCollection.approvedBy && (
                          <div className="text-muted small mt-1">
                            Processed by: {appointment.homeCollection.approvedBy.firstName} {appointment.homeCollection.approvedBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {appointment.homeCollection.approved === undefined && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setApprovalData({
                                  approved: true,
                                  collectionDate: appointment.appointmentDate,
                                  collectionTime: appointment.homeCollection.preferredTime || '',
                                  assignedCollector: '',
                                  notes: ''
                                });
                                setShowApprovalModal(true);
                              }}
                              title="Process Request"
                            >
                              <i className="fas fa-cog"></i>
                            </Button>
                          )}
                          
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

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-home text-primary me-2"></i>
            Process Home Collection Request
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
                  <h6>Collection Request Details</h6>
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
            </div>
          )}
          
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Collection Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={approvalData.collectionDate}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, collectionDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Collection Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={approvalData.collectionTime}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, collectionTime: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Assigned Collector</Form.Label>
              <Form.Control
                type="text"
                value={approvalData.assignedCollector}
                onChange={(e) => setApprovalData(prev => ({ ...prev, assignedCollector: e.target.value }))}
                placeholder="Enter collector name or ID"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={approvalData.notes}
                onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this collection request..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRejectHomeCollection}
            className="me-2"
          >
            <i className="fas fa-times me-1"></i>
            Reject Request
          </Button>
          <Button 
            variant="success" 
            onClick={handleApproveHomeCollection}
            disabled={!approvalData.collectionDate || !approvalData.collectionTime}
          >
            <i className="fas fa-check me-1"></i>
            Approve Request
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HomeCollectionManagement;
