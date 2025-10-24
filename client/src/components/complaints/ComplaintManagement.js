import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { complaintAPI } from '../../services/api';
import { format } from 'date-fns';

const ComplaintManagement = () => {
  const { user, hasRole } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getAll({ limit: 1000 });
      setComplaints(response.data.complaints || response.data);
    } catch (error) {
      toast.error('Error fetching complaints');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await complaintAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedComplaints.length === 0) return;

    try {
      const promises = selectedComplaints.map(complaintId => {
        switch (bulkAction) {
          case 'assign':
            return complaintAPI.assign(complaintId, { assignedTo: user.id, notes: 'Bulk assigned' });
          case 'close':
            return complaintAPI.update(complaintId, { status: 'Closed' });
          case 'priority_high':
            return complaintAPI.updatePriority(complaintId, { priority: 'High' });
          case 'priority_urgent':
            return complaintAPI.updatePriority(complaintId, { priority: 'Urgent' });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      toast.success(`Bulk action completed for ${selectedComplaints.length} complaints`);
      setShowBulkActionModal(false);
      setSelectedComplaints([]);
      setBulkAction('');
      fetchComplaints();
    } catch (error) {
      toast.error('Error performing bulk action');
      console.error('Error:', error);
    }
  };

  const handleComplaintSelect = (complaintId) => {
    setSelectedComplaints(prev => 
      prev.includes(complaintId) 
        ? prev.filter(id => id !== complaintId)
        : [...prev, complaintId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComplaints.length === complaints.length) {
      setSelectedComplaints([]);
    } else {
      setSelectedComplaints(complaints.map(c => c._id));
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

  const getStatusProgress = (status) => {
    const progressMap = {
      'Open': 20,
      'Assigned': 40,
      'In Progress': 60,
      'Resolved': 80,
      'Closed': 100
    };
    return progressMap[status] || 0;
  };

  const canManageComplaints = hasRole('superadmin') || hasRole('receptionist');

  if (!canManageComplaints) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to access complaint management.</p>
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
            <i className="fas fa-cogs me-2"></i>
            Complaint Management
          </h2>
          <p className="text-muted">Advanced complaint workflow management and analytics.</p>
        </Col>
        <Col className="text-end">
          <Button 
            variant="info" 
            onClick={() => setShowStatsModal(true)}
            className="me-2"
          >
            <i className="fas fa-chart-bar me-1"></i>
            View Statistics
          </Button>
          <Button 
            variant="warning" 
            onClick={() => setShowBulkActionModal(true)}
            disabled={selectedComplaints.length === 0}
          >
            <i className="fas fa-tasks me-1"></i>
            Bulk Actions ({selectedComplaints.length})
          </Button>
        </Col>
      </Row>

      {/* Quick Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-warning">{stats.open || 0}</h5>
              <p className="mb-0">Open Complaints</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-info">{stats.assigned || 0}</h5>
              <p className="mb-0">Assigned</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-primary">{stats.inProgress || 0}</h5>
              <p className="mb-0">In Progress</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-success">{stats.resolved || 0}</h5>
              <p className="mb-0">Resolved</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Complaints Table */}
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                All Complaints ({complaints.length})
              </h5>
            </Col>
            <Col className="text-end">
              <Form.Check
                type="checkbox"
                label="Select All"
                checked={selectedComplaints.length === complaints.length}
                onChange={handleSelectAll}
              />
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          <Table striped bordered hover responsive className="mb-0">
            <thead className="table-dark">
              <tr>
                <th width="50">Select</th>
                <th>Subject</th>
                <th>Patient</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint._id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedComplaints.includes(complaint._id)}
                      onChange={() => handleComplaintSelect(complaint._id)}
                    />
                  </td>
                  <td>
                    <div>
                      <strong>{complaint.subject}</strong>
                      <div className="text-muted small">{complaint.description.substring(0, 50)}...</div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{complaint.patientId?.firstName} {complaint.patientId?.lastName}</strong>
                      <div className="text-muted small">{complaint.patientId?.email}</div>
                    </div>
                  </td>
                  <td>{complaint.category}</td>
                  <td>{getPriorityBadge(complaint.priority)}</td>
                  <td>{getStatusBadge(complaint.status)}</td>
                  <td>
                    <ProgressBar 
                      now={getStatusProgress(complaint.status)} 
                      variant={complaint.status === 'Closed' ? 'success' : 'primary'}
                      style={{ height: '20px' }}
                    />
                    <small className="text-muted">{getStatusProgress(complaint.status)}%</small>
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
                        variant="outline-info"
                        size="sm"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      {complaint.status === 'Open' && (
                        <Button
                          variant="outline-warning"
                          size="sm"
                          title="Assign"
                        >
                          <i className="fas fa-user-plus"></i>
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

      {/* Statistics Modal */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-chart-bar text-info me-2"></i>
            Complaint Statistics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h6>Status Distribution</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Open</span>
                  <span>{stats.open || 0}</span>
                </div>
                <ProgressBar now={(stats.open || 0) / (stats.total || 1) * 100} variant="warning" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Assigned</span>
                  <span>{stats.assigned || 0}</span>
                </div>
                <ProgressBar now={(stats.assigned || 0) / (stats.total || 1) * 100} variant="info" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>In Progress</span>
                  <span>{stats.inProgress || 0}</span>
                </div>
                <ProgressBar now={(stats.inProgress || 0) / (stats.total || 1) * 100} variant="primary" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Resolved</span>
                  <span>{stats.resolved || 0}</span>
                </div>
                <ProgressBar now={(stats.resolved || 0) / (stats.total || 1) * 100} variant="success" />
              </div>
            </Col>
            <Col md={6}>
              <h6>Priority Distribution</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Low</span>
                  <span>{stats.lowPriority || 0}</span>
                </div>
                <ProgressBar now={(stats.lowPriority || 0) / (stats.total || 1) * 100} variant="success" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Medium</span>
                  <span>{stats.mediumPriority || 0}</span>
                </div>
                <ProgressBar now={(stats.mediumPriority || 0) / (stats.total || 1) * 100} variant="warning" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>High</span>
                  <span>{stats.highPriority || 0}</span>
                </div>
                <ProgressBar now={(stats.highPriority || 0) / (stats.total || 1) * 100} variant="danger" />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Urgent</span>
                  <span>{stats.urgentPriority || 0}</span>
                </div>
                <ProgressBar now={(stats.urgentPriority || 0) / (stats.total || 1) * 100} variant="dark" />
              </div>
            </Col>
          </Row>
          
          <Row className="mt-3">
            <Col md={12}>
              <h6>Summary</h6>
              <div className="row">
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-primary">{stats.total || 0}</h4>
                    <p className="mb-0">Total Complaints</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-success">{stats.resolved || 0}</h4>
                    <p className="mb-0">Resolved</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <h4 className="text-warning">{stats.open || 0}</h4>
                    <p className="mb-0">Pending</p>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal show={showBulkActionModal} onHide={() => setShowBulkActionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-tasks text-warning me-2"></i>
            Bulk Actions
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Selected {selectedComplaints.length} complaints for bulk action.</p>
          
          <Form.Group className="mb-3">
            <Form.Label>Select Action</Form.Label>
            <Form.Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Choose an action...</option>
              <option value="assign">Assign to Me</option>
              <option value="close">Close Complaints</option>
              <option value="priority_high">Set High Priority</option>
              <option value="priority_urgent">Set Urgent Priority</option>
            </Form.Select>
          </Form.Group>

          {bulkAction && (
            <Alert variant="warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              This action will be applied to {selectedComplaints.length} selected complaints. This action cannot be undone.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkActionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleBulkAction}
            disabled={!bulkAction}
          >
            <i className="fas fa-tasks me-1"></i>
            Apply Bulk Action
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ComplaintManagement;
