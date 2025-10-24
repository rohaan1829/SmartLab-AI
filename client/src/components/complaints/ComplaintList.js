import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Modal, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { complaintAPI } from '../../services/api';
import { format } from 'date-fns';

const ComplaintList = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter })
      };
      
      const response = await complaintAPI.getAll(params);
      setComplaints(response.data.complaints || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Error fetching complaints');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        await complaintAPI.delete(id);
        toast.success('Complaint deleted successfully');
        fetchComplaints();
      } catch (error) {
        toast.error('Error deleting complaint');
        console.error('Error:', error);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await complaintAPI.update(id, { status: newStatus });
      toast.success('Complaint status updated');
      fetchComplaints();
    } catch (error) {
      toast.error('Error updating complaint status');
      console.error('Error:', error);
    }
  };

  const handlePriorityChange = async (id, newPriority) => {
    try {
      await complaintAPI.updatePriority(id, { priority: newPriority });
      toast.success('Complaint priority updated');
      fetchComplaints();
    } catch (error) {
      toast.error('Error updating complaint priority');
      console.error('Error:', error);
    }
  };

  const handleAssignment = async () => {
    if (!selectedComplaint) return;

    try {
      await complaintAPI.assign(selectedComplaint._id, assignmentData);
      toast.success('Complaint assigned successfully');
      setShowAssignmentModal(false);
      setSelectedComplaint(null);
      setAssignmentData({ assignedTo: '', notes: '' });
      fetchComplaints();
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
      fetchComplaints();
    } catch (error) {
      toast.error('Error resolving complaint');
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
  const canDeleteComplaints = hasRole('superadmin');

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
            Complaints Management
          </h2>
          <p className="text-muted">
            {hasRole('superadmin') && 'Complete complaint management system'}
            {hasRole('receptionist') && 'Manage and resolve patient complaints'}
            {hasRole('patient') && 'View and manage your complaints'}
          </p>
        </Col>
        {canManageComplaints && (
          <Col className="text-end">
            <Button as={Link} to="/complaints/new" variant="primary">
              <i className="fas fa-plus me-2"></i>
              Create New Complaint
            </Button>
          </Col>
        )}
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Row>
              <Col md={4}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search complaints by patient name, subject, or description..."
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
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setPriorityFilter('');
                    setCurrentPage(1);
                    fetchComplaints();
                  }}
                >
                  <i className="fas fa-times me-1"></i>
                  Clear
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {complaints.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No complaints found.
          {canManageComplaints && (
            <div className="mt-2">
              <Button as={Link} to="/complaints/new" variant="primary" size="sm">
                Create First Complaint
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
                    Complaints List ({complaints.length} total)
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
                      <i className="fas fa-file-alt me-1"></i>
                      Subject
                    </th>
                    <th>
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    <th>
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      Priority
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-1"></i>
                      Status
                    </th>
                    <th>
                      <i className="fas fa-user-md me-1"></i>
                      Assigned To
                    </th>
                    <th>
                      <i className="fas fa-calendar me-1"></i>
                      Created
                    </th>
                    <th>
                      <i className="fas fa-cogs me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td>
                        <div>
                          <strong>{complaint.subject}</strong>
                          {complaint.description && (
                            <div className="text-muted small">
                              {complaint.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>
                            {complaint.patientId ? 
                              `${complaint.patientId.firstName} ${complaint.patientId.lastName}` : 
                              'N/A'
                            }
                          </strong>
                          {complaint.patientId?.email && (
                            <div className="text-muted small">
                              {complaint.patientId.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {getPriorityBadge(complaint.priority)}
                      </td>
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
                        <div className="d-flex gap-1">
                          <Button
                            as={Link}
                            to={`/complaints/${complaint._id}`}
                            variant="outline-info"
                            size="sm"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          
                          {canManageComplaints && (
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

                          {complaint.status === 'Open' && canManageComplaints && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setShowAssignmentModal(true);
                              }}
                              title="Assign Complaint"
                            >
                              <i className="fas fa-user-plus"></i>
                            </Button>
                          )}

                          {complaint.status === 'In Progress' && canManageComplaints && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setShowResolutionModal(true);
                              }}
                              title="Resolve Complaint"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}

                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" size="sm">
                              <i className="fas fa-cog"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && (
                                <>
                                  <Dropdown.Item onClick={() => handleStatusChange(complaint._id, 'In Progress')}>
                                    Mark as In Progress
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleStatusChange(complaint._id, 'Closed')}>
                                    Close Complaint
                                  </Dropdown.Item>
                                </>
                              )}
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => handlePriorityChange(complaint._id, 'High')}>
                                Set High Priority
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handlePriorityChange(complaint._id, 'Urgent')}>
                                Set Urgent Priority
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>

                          {canDeleteComplaints && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(complaint._id)}
                              title="Delete Complaint"
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
              <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
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
      <Modal show={showResolutionModal} onHide={() => setShowResolutionModal(false)}>
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
              <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
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

export default ComplaintList;
