import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { reportAPI } from '../../services/api';
import { format } from 'date-fns';

const PendingReports = () => {
  const { user, hasRole } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState('Approved');
  const [filterStatus, setFilterStatus] = useState('Pending Review');

  const fetchPendingReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getPending();
      setReports(response.data);
    } catch (error) {
      toast.error('Error fetching pending reports');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingReports();
  }, [fetchPendingReports]);

  const handleReview = async () => {
    if (!selectedReport) return;
    
    try {
      await reportAPI.updateStatus(selectedReport._id, reviewDecision, user.id);
      toast.success(`Report ${reviewDecision.toLowerCase()} successfully`);
      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewNotes('');
      setReviewDecision('Approved');
      fetchPendingReports();
    } catch (error) {
      toast.error('Error reviewing report');
      console.error('Error:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await reportAPI.updateStatus(id, newStatus, user.id);
      toast.success('Report status updated');
      fetchPendingReports();
    } catch (error) {
      toast.error('Error updating report status');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Draft': 'secondary',
      'Pending Review': 'warning',
      'Approved': 'success',
      'Rejected': 'danger',
      'Published': 'info'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      'Low': 'success',
      'Medium': 'warning',
      'High': 'danger',
      'Critical': 'dark'
    };
    return <Badge bg={priorityColors[priority] || 'secondary'}>{priority}</Badge>;
  };

  const canReviewReports = hasRole('superadmin') || hasRole('receptionist');

  if (!canReviewReports) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>You don't have permission to review reports.</p>
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

  const filteredReports = reports.filter(report => 
    filterStatus === 'All' || report.status === filterStatus
  );

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <i className="fas fa-clipboard-check me-2"></i>
            Pending Reports Review
          </h2>
          <p className="text-muted">
            Review and approve/reject medical reports from patients and staff
          </p>
        </Col>
        <Col className="text-end">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="Pending Review">Pending Review Only</option>
            <option value="Approved">Approved Only</option>
            <option value="Rejected">Rejected Only</option>
            <option value="All">All Statuses</option>
          </Form.Select>
        </Col>
      </Row>

      {filteredReports.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No reports found with the selected filter.
        </Alert>
      ) : (
        <>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Reports ({filteredReports.length} total)
                  </h5>
                </Col>
                <Col className="text-end">
                  <Badge bg="warning" className="me-2">
                    {reports.filter(report => report.status === 'Pending Review').length} Pending
                  </Badge>
                  <Badge bg="success">
                    {reports.filter(report => report.status === 'Approved').length} Approved
                  </Badge>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>
                      <i className="fas fa-file-alt me-1"></i>
                      Title
                    </th>
                    <th>
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    <th>
                      <i className="fas fa-user-md me-1"></i>
                      Created By
                    </th>
                    <th>
                      <i className="fas fa-stethoscope me-1"></i>
                      Type
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
                  {filteredReports.map((report) => (
                    <tr key={report._id}>
                      <td>
                        <div>
                          <strong>{report.title}</strong>
                          {report.description && (
                            <div className="text-muted small">
                              {report.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>
                            {report.patientId ? 
                              `${report.patientId.firstName} ${report.patientId.lastName}` : 
                              'N/A'
                            }
                          </strong>
                          {report.patientId?.email && (
                            <div className="text-muted small">
                              {report.patientId.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {report.createdBy ? 
                          `${report.createdBy.firstName} ${report.createdBy.lastName}` : 
                          <span className="text-muted">Unknown</span>
                        }
                      </td>
                      <td>
                        <Badge bg="info">{report.reportType}</Badge>
                      </td>
                      <td>
                        {getPriorityBadge(report.priority)}
                      </td>
                      <td>
                        {getStatusBadge(report.status)}
                        {report.reviewedBy && (
                          <div className="text-muted small mt-1">
                            Reviewed by: {report.reviewedBy.firstName} {report.reviewedBy.lastName}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>
                          <strong>{format(new Date(report.createdAt), 'MM/dd/yyyy')}</strong>
                          <div className="text-muted small">
                            {format(new Date(report.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {report.status === 'Pending Review' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowReviewModal(true);
                              }}
                              title="Review Report"
                            >
                              <i className="fas fa-clipboard-check"></i>
                            </Button>
                          )}

                          {report.status === 'Approved' && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleStatusChange(report._id, 'Published')}
                              title="Publish Report"
                            >
                              <i className="fas fa-globe"></i>
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

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-clipboard-check text-warning me-2"></i>
            Review Report
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div className="mb-4">
              <Row>
                <Col md={6}>
                  <h6>Report Information</h6>
                  <p><strong>Title:</strong> {selectedReport.title}</p>
                  <p><strong>Type:</strong> {selectedReport.reportType}</p>
                  <p><strong>Priority:</strong> {selectedReport.priority}</p>
                  <p><strong>Created:</strong> {format(new Date(selectedReport.createdAt), 'MM/dd/yyyy HH:mm')}</p>
                  <p><strong>Created By:</strong> {selectedReport.createdBy?.firstName} {selectedReport.createdBy?.lastName}</p>
                </Col>
                <Col md={6}>
                  <h6>Patient Information</h6>
                  <p><strong>Name:</strong> {selectedReport.patientId?.firstName} {selectedReport.patientId?.lastName}</p>
                  <p><strong>Email:</strong> {selectedReport.patientId?.email}</p>
                  <p><strong>Phone:</strong> {selectedReport.patientId?.phone}</p>
                  <p><strong>Date of Birth:</strong> {selectedReport.patientId?.dateOfBirth ? format(new Date(selectedReport.patientId.dateOfBirth), 'MM/dd/yyyy') : 'N/A'}</p>
                </Col>
              </Row>
              
              <Row className="mt-3">
                <Col md={12}>
                  <h6>Report Description</h6>
                  <p className="border p-2 rounded bg-light">{selectedReport.description}</p>
                </Col>
              </Row>

              {selectedReport.findings && selectedReport.findings.length > 0 && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Test Findings</h6>
                    <div className="border p-2 rounded bg-light">
                      <Table size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Result</th>
                            <th>Unit</th>
                            <th>Normal Range</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.findings.map((finding, index) => (
                            <tr key={index}>
                              <td>{finding.testName}</td>
                              <td>{finding.result}</td>
                              <td>{finding.unit}</td>
                              <td>{finding.normalRange}</td>
                              <td>
                                <Badge bg={finding.status === 'Normal' ? 'success' : finding.status === 'Abnormal' ? 'warning' : 'danger'}>
                                  {finding.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedReport.diagnosis && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Diagnosis</h6>
                    <p className="border p-2 rounded bg-light">{selectedReport.diagnosis}</p>
                  </Col>
                </Row>
              )}

              {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Recommendations</h6>
                    <div className="border p-2 rounded bg-light">
                      <ul className="mb-0">
                        {selectedReport.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedReport.followUpRequired && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6>Follow-up Information</h6>
                    <div className="border p-2 rounded bg-light">
                      <p><strong>Follow-up Required:</strong> Yes</p>
                      {selectedReport.followUpDate && (
                        <p><strong>Follow-up Date:</strong> {format(new Date(selectedReport.followUpDate), 'MM/dd/yyyy')}</p>
                      )}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedReport.isConfidential && (
                <Row className="mt-3">
                  <Col md={12}>
                    <Alert variant="warning">
                      <i className="fas fa-lock me-2"></i>
                      This report is marked as confidential and contains sensitive information.
                    </Alert>
                  </Col>
                </Row>
              )}
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Review Decision *</Form.Label>
              <Form.Select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
              >
                <option value="Approved">Approve Report</option>
                <option value="Rejected">Reject Report</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Review Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this review..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={reviewDecision === 'Approved' ? 'success' : 'danger'} 
            onClick={handleReview}
          >
            <i className={`fas fa-${reviewDecision === 'Approved' ? 'check' : 'times'} me-1`}></i>
            {reviewDecision} Report
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingReports;
