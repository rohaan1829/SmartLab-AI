import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { complaintAPI } from '../../services/api';
import { format } from 'date-fns';

const PatientComplaints = () => {
  const { user, hasRole } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchPatientComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getMy();
      const filteredComplaints = response.data.filter(
        (complaint) => filterStatus === 'All' || complaint.status === filterStatus
      );
      setComplaints(filteredComplaints);
    } catch (error) {
      toast.error('Error fetching your complaints');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (hasRole('patient')) {
      fetchPatientComplaints();
    }
  }, [fetchPatientComplaints, hasRole]);

  const handleAddComment = async (complaintId, comment) => {
    try {
      await complaintAPI.addComment(complaintId, { comment });
      toast.success('Comment added successfully');
      fetchPatientComplaints();
    } catch (error) {
      toast.error('Error adding comment');
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

  const canViewComplaints = hasRole('patient');

  if (!canViewComplaints) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to view patient complaints.</p>
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
            <i className="fas fa-comments me-2"></i>
            My Complaints
          </h2>
          <p className="text-muted">View and track your submitted complaints.</p>
        </Col>
        <Col className="text-end">
          <Button as={Link} to="/complaints/new" variant="primary">
            <i className="fas fa-plus me-2"></i>
            Submit New Complaint
          </Button>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col sm="4">
              <Form.Group>
                <Form.Label>Filter by Status:</Form.Label>
                <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm="8" className="text-end">
              <Badge bg="warning" className="me-2">
                Open: {complaints.filter(c => c.status === 'Open').length}
              </Badge>
              <Badge bg="info" className="me-2">
                In Progress: {complaints.filter(c => c.status === 'In Progress').length}
              </Badge>
              <Badge bg="success">
                Resolved: {complaints.filter(c => c.status === 'Resolved').length}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {complaints.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No complaints found.
          <div className="mt-2">
            <Button as={Link} to="/complaints/new" variant="primary" size="sm">
              Submit Your First Complaint
            </Button>
          </div>
        </Alert>
      ) : (
        <Card>
          <Card.Header className="bg-light">
            <h5 className="mb-0">
              <i className="fas fa-list-alt me-2"></i>
              Your Complaints List
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table striped bordered hover responsive className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created Date</th>
                  <th>Last Updated</th>
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
                    <td>{complaint.category}</td>
                    <td>{getPriorityBadge(complaint.priority)}</td>
                    <td>
                      {getStatusBadge(complaint.status)}
                      {complaint.resolvedBy && (
                        <div className="text-muted small mt-1">
                          Resolved by: {complaint.resolvedBy.firstName} {complaint.resolvedBy.lastName}
                        </div>
                      )}
                    </td>
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
                      <div>
                        <strong>{format(new Date(complaint.updatedAt), 'MM/dd/yyyy')}</strong>
                        <div className="text-muted small">
                          {format(new Date(complaint.updatedAt), 'HH:mm')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setShowComplaintModal(true);
                          }}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>

                        {complaint.status !== 'Closed' && (
                          <Button
                            as={Link}
                            to={`/complaints/${complaint._id}/edit`}
                            variant="outline-primary"
                            size="sm"
                            title="Edit Complaint"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        )}

                        {complaint.status === 'Resolved' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            disabled
                            title="Complaint Resolved"
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
      )}

      {/* Complaint Details Modal */}
      <Modal show={showComplaintModal} onHide={() => setShowComplaintModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-comments text-primary me-2"></i>
            Complaint Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Complaint Information</h6>
                  <p><strong>Subject:</strong> {selectedComplaint.subject}</p>
                  <p><strong>Category:</strong> {selectedComplaint.category}</p>
                  <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedComplaint.status)}</p>
                  <p><strong>Created:</strong> {format(new Date(selectedComplaint.createdAt), 'MM/dd/yyyy HH:mm')}</p>
                </Col>
                <Col md={6}>
                  <h6>Assignment Information</h6>
                  <p><strong>Assigned To:</strong> {
                    selectedComplaint.assignedTo ? 
                      `${selectedComplaint.assignedTo.firstName} ${selectedComplaint.assignedTo.lastName}` : 
                      'Not assigned yet'
                  }</p>
                  <p><strong>Contact Method:</strong> {selectedComplaint.contactMethod}</p>
                  <p><strong>Preferred Contact Time:</strong> {selectedComplaint.preferredContactTime || 'Not specified'}</p>
                  {selectedComplaint.resolvedBy && (
                    <p><strong>Resolved By:</strong> {selectedComplaint.resolvedBy.firstName} {selectedComplaint.resolvedBy.lastName}</p>
                  )}
                </Col>
              </Row>
              
              <Row className="mt-3">
                <Col md={12}>
                  <h6>Complaint Description</h6>
                  <div className="border p-3 rounded bg-light">
                    <p>{selectedComplaint.description}</p>
                  </div>
                </Col>
              </Row>

              {selectedComplaint.resolution && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Resolution</h6>
                    <div className="border p-3 rounded bg-light">
                      <p>{selectedComplaint.resolution}</p>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedComplaint.resolutionNotes && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Resolution Notes</h6>
                    <div className="border p-3 rounded bg-light">
                      <p>{selectedComplaint.resolutionNotes}</p>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedComplaint.comments && selectedComplaint.comments.length > 0 && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Comments</h6>
                    <div className="border p-3 rounded bg-light">
                      {selectedComplaint.comments.map((comment, index) => (
                        <div key={index} className="mb-2 p-2 border-bottom">
                          <strong>{comment.author?.firstName} {comment.author?.lastName}:</strong>
                          <p className="mb-1">{comment.comment}</p>
                          <small className="text-muted">
                            {format(new Date(comment.createdAt), 'MM/dd/yyyy HH:mm')}
                          </small>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedComplaint.status === 'Open' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Status:</strong> Your complaint has been received and is awaiting assignment to a staff member.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedComplaint.status === 'Assigned' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="warning">
                      <i className="fas fa-user-check me-2"></i>
                      <strong>Status:</strong> Your complaint has been assigned to a staff member and is being reviewed.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedComplaint.status === 'In Progress' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="primary">
                      <i className="fas fa-cog me-2"></i>
                      <strong>Status:</strong> Your complaint is being actively worked on by our staff.
                    </Alert>
                  </Col>
                </Row>
              )}

              {selectedComplaint.status === 'Resolved' && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="success">
                      <i className="fas fa-check-circle me-2"></i>
                      <strong>Status:</strong> Your complaint has been resolved. Please review the resolution above.
                    </Alert>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowComplaintModal(false)}>
            Close
          </Button>
          {selectedComplaint?.status !== 'Closed' && (
            <Button 
              as={Link}
              to={`/complaints/${selectedComplaint?._id}/edit`}
              variant="primary"
            >
              <i className="fas fa-edit me-1"></i>
              Edit Complaint
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PatientComplaints;
