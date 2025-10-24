import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { complaintAPI } from '../../services/api';
import { format } from 'date-fns';

const PendingComplaints = () => {
  const { user, hasRole } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Open');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    notes: ''
  });
  const [resolutionData, setResolutionData] = useState({
    resolution: '',
    resolutionNotes: ''
  });

  const fetchPendingComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getPending();
      const filteredComplaints = response.data.filter(
        (complaint) => filterStatus === 'All' || complaint.status === filterStatus
      );
      setComplaints(filteredComplaints);
    } catch (error) {
      toast.error('Error fetching pending complaints');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPendingComplaints();
  }, [fetchPendingComplaints]);

  const handleAssignment = async () => {
    if (!selectedComplaint) return;

    try {
      await complaintAPI.assign(selectedComplaint._id, assignmentData);
      toast.success('Complaint assigned successfully');
      setShowAssignmentModal(false);
      setSelectedComplaint(null);
      setAssignmentData({ assignedTo: '', notes: '' });
      fetchPendingComplaints();
    } catch (error) {
      toast.error('Error assigning complaint');
      console.error('Error:', error);
    }
  };

  const handleResolution = async () => {
    if (!selectedComplaint) return;

    try {
      await complaintAPI.resolve(selectedComplaint._id, {
        ...resolutionData,
        resolvedBy: user.id
      });
      toast.success('Complaint resolved successfully');
      setShowResolutionModal(false);
      setSelectedComplaint(null);
      setResolutionData({ resolution: '', resolutionNotes: '' });
      fetchPendingComplaints();
    } catch (error) {
      toast.error('Error resolving complaint');
      console.error('Error:', error);
    }
  };

  const handlePriorityUpdate = async (complaintId, newPriority) => {
    try {
      await complaintAPI.updatePriority(complaintId, { priority: newPriority });
      toast.success('Complaint priority updated');
      fetchPendingComplaints();
    } catch (error) {
      toast.error('Error updating complaint priority');
      console.error('Error:', error);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      await complaintAPI.update(complaintId, { status: newStatus });
      toast.success('Complaint status updated');
      fetchPendingComplaints();
    } catch (error) {
      toast.error('Error updating complaint status');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Open': 'warning',
      'Assigned': 'info',
      'In Progress': 'primary',
      'Resolved': 'success',
      'Closed': 'secondary'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      'Low': 'success',
      'Medium': 'warning',
      'High': 'danger',
      'Urgent': 'dark'
    };
    return <Badge bg={priorityColors[priority] || 'secondary'}>{priority}</Badge>;
  };

  const canManageComplaints = hasRole('superadmin') || hasRole('receptionist');

  if (!canManageComplaints) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to view pending complaints.</p>
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
            <i className="fas fa-clock me-2"></i>
            Pending Complaints
          </h2>
          <p className="text-muted">Review and manage complaints awaiting attention.</p>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group as={Row} className="align-items-center">
            <Form.Label column sm="2">Filter by Status:</Form.Label>
            <Col sm="4">
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="All">All</option>
              </Form.Select>
            </Col>
            <Col sm="6" className="text-end">
              <Badge bg="warning" className="me-2">
                Open: {complaints.filter(c => c.status === 'Open').length}
              </Badge>
              <Badge bg="info">
                Assigned: {complaints.filter(c => c.status === 'Assigned').length}
              </Badge>
            </Col>
          </Form.Group>
        </Card.Body>
      </Card>

      {complaints.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No {filterStatus.toLowerCase()} complaints found.
        </Alert>
      ) : (
        <Card>
          <Card.Header className="bg-light">
            <h5 className="mb-0">
              <i className="fas fa-list me-2"></i>
              Complaints List
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table striped bordered hover responsive className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Subject</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint._id}>
                    <td>
                      <strong>{complaint.subject}</strong>
                      <div className="text-muted small">{complaint.description.substring(0, 50)}...</div>
                    </td>
                    <td>
                      <strong>{complaint.patientId?.firstName} {complaint.patientId?.lastName}</strong>
                      <div className="text-muted small">{complaint.patientId?.email}</div>
                    </td>
                    <td>{complaint.category}</td>
                    <td>{getPriorityBadge(complaint.priority)}</td>
                    <td>{getStatusBadge(complaint.status)}</td>
                    <td>
                      {complaint.assignedTo ? 
                        `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}` : 
                        <span className="text-muted">Unassigned</span>
                      }
                    </td>
                    <td>
                      <div>
                        <strong>{format(new Date(complaint.createdAt), 'MM/dd/yyyy')}</strong>
                        <div className="text-muted small">
                          {format(new Date(complaint.createdAt), 'HH:mm')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {complaint.status === 'Open' && (
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setShowAssignmentModal(true);
                            }}
                            title="Assign Complaint"
                          >
                            <i className="fas fa-user-plus"></i> Assign
                          </Button>
                        )}

                        {complaint.status === 'In Progress' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setShowResolutionModal(true);
                            }}
                            title="Resolve Complaint"
                          >
                            <i className="fas fa-check"></i> Resolve
                          </Button>
                        )}

                        {complaint.status === 'Assigned' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusUpdate(complaint._id, 'In Progress')}
                            title="Mark as In Progress"
                          >
                            <i className="fas fa-play"></i> Start
                          </Button>
                        )}

                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            // You could open a details modal here
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
      )}

      {/* Assignment Modal */}
      <Modal show={showAssignmentModal} onHide={() => setShowAssignmentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-plus text-warning me-2"></i>
            Assign Complaint
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint && (
            <div className="mb-3">
              <h6>Complaint Details</h6>
              <p><strong>Subject:</strong> {selectedComplaint.subject}</p>
              <p><strong>Patient:</strong> {selectedComplaint.patientId?.firstName} {selectedComplaint.patientId?.lastName}</p>
              <p><strong>Category:</strong> {selectedComplaint.category}</p>
              <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
              <p><strong>Description:</strong></p>
              <div className="border p-2 rounded bg-light">
                {selectedComplaint.description}
              </div>
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Assign To *</Form.Label>
              <Form.Select
                value={assignmentData.assignedTo}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Select Staff Member</option>
                <option value={user.id}>Assign to Me</option>
                {/* In a real app, you'd fetch available staff members */}
                <option value="other">Other Staff Member</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Assignment Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this assignment..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignmentModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleAssignment}
            disabled={!assignmentData.assignedTo}
          >
            <i className="fas fa-user-plus me-1"></i>
            Assign Complaint
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Resolution Modal */}
      <Modal show={showResolutionModal} onHide={() => setShowResolutionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-check text-success me-2"></i>
            Resolve Complaint
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint && (
            <div className="mb-3">
              <h6>Complaint Details</h6>
              <p><strong>Subject:</strong> {selectedComplaint.subject}</p>
              <p><strong>Patient:</strong> {selectedComplaint.patientId?.firstName} {selectedComplaint.patientId?.lastName}</p>
              <p><strong>Category:</strong> {selectedComplaint.category}</p>
              <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
              <p><strong>Description:</strong></p>
              <div className="border p-2 rounded bg-light">
                {selectedComplaint.description}
              </div>
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Resolution *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={resolutionData.resolution}
                onChange={(e) => setResolutionData(prev => ({ ...prev, resolution: e.target.value }))}
                placeholder="Describe how this complaint was resolved..."
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Resolution Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={resolutionData.resolutionNotes}
                onChange={(e) => setResolutionData(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                placeholder="Add any additional notes..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResolutionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleResolution}
            disabled={!resolutionData.resolution.trim()}
          >
            <i className="fas fa-check me-1"></i>
            Resolve Complaint
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingComplaints;
