import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Modal, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { reportAPI } from '../../services/api';
import { format } from 'date-fns';

const ReportList = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState('Approved');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(reportTypeFilter && { reportType: reportTypeFilter }),
        ...(statusFilter && { status: statusFilter })
      };
      
      // Use role-appropriate endpoint
      const endpoint = hasRole('patient') ? 'getMy' : 'getAll';
      const response = await reportAPI[endpoint](params);
      setReports(response.data.reports || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Error fetching reports');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, reportTypeFilter, statusFilter, hasRole]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await reportAPI.delete(id);
        toast.success('Report deleted successfully');
        fetchReports();
      } catch (error) {
        toast.error('Error deleting report');
        console.error('Error:', error);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await reportAPI.updateStatus(id, newStatus, user.id);
      toast.success('Report status updated');
      fetchReports();
    } catch (error) {
      toast.error('Error updating report status');
      console.error('Error:', error);
    }
  };

  const handleReview = async () => {
    if (!selectedReport) return;
    
    try {
      await reportAPI.updateStatus(selectedReport._id, reviewDecision, user.id);
      toast.success(`Report ${reviewDecision.toLowerCase()} successfully`);
      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewNotes('');
      setReviewDecision('Approved');
      fetchReports();
    } catch (error) {
      toast.error('Error reviewing report');
      console.error('Error:', error);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await reportAPI.download(id);
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Error downloading report');
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

  const canManageReports = hasRole('superadmin') || hasRole('receptionist');
  const canReviewReports = hasRole('superadmin') || hasRole('receptionist');
  const canDeleteReports = hasRole('superadmin');
  const canDownloadReports = hasRole('patient') || canManageReports;

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
            <i className="fas fa-file-medical-alt me-2"></i>
            Reports Management
          </h2>
          <p className="text-muted">
            {hasRole('superadmin') && 'Complete report management system'}
            {hasRole('receptionist') && 'Manage reports and review workflow'}
            {hasRole('patient') && 'View and download your medical reports'}
          </p>
        </Col>
        {canManageReports && (
          <Col className="text-end">
            <Button as={Link} to="/reports/new" variant="primary">
              <i className="fas fa-plus me-2"></i>
              Create New Report
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
                    placeholder="Search reports by title, patient name, or type..."
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
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Urine Test">Urine Test</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="MRI">MRI</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="ECG">ECG</option>
                  <option value="Pathology">Pathology</option>
                  <option value="General">General</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Published">Published</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm('');
                    setReportTypeFilter('');
                    setStatusFilter('');
                    setCurrentPage(1);
                    fetchReports();
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

      {reports.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No reports found.
          {canManageReports && (
            <div className="mt-2">
              <Button as={Link} to="/reports/new" variant="primary" size="sm">
                Create First Report
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
                    Reports List ({reports.length} total)
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
                      Title
                    </th>
                    <th>
                      <i className="fas fa-user me-1"></i>
                      Patient
                    </th>
                    {canManageReports && (
                      <th>
                        <i className="fas fa-user-md me-1"></i>
                        Created By
                      </th>
                    )}
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
                  {reports.map((report) => (
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
                      {canManageReports && (
                        <td>
                          {report.createdBy ? 
                            `${report.createdBy.firstName} ${report.createdBy.lastName}` : 
                            <span className="text-muted">Unknown</span>
                          }
                        </td>
                      )}
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
                          <Button
                            as={Link}
                            to={`/reports/${report._id}`}
                            variant="outline-info"
                            size="sm"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          
                          {canManageReports && (
                            <Button
                              as={Link}
                              to={`/reports/${report._id}/edit`}
                              variant="outline-primary"
                              size="sm"
                              title="Edit Report"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}

                          {report.status === 'Pending Review' && canReviewReports && (
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
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <i className="fas fa-cog"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleStatusChange(report._id, 'Published')}>
                                  Publish Report
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(report._id, 'Draft')}>
                                  Move to Draft
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}

                          {canDownloadReports && report.status === 'Published' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleDownload(report._id)}
                              title="Download Report"
                            >
                              <i className="fas fa-download"></i>
                            </Button>
                          )}

                          {canDeleteReports && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(report._id)}
                              title="Delete Report"
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

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg">
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
                </Col>
                <Col md={6}>
                  <h6>Patient Information</h6>
                  <p><strong>Name:</strong> {selectedReport.patientId?.firstName} {selectedReport.patientId?.lastName}</p>
                  <p><strong>Email:</strong> {selectedReport.patientId?.email}</p>
                  <p><strong>Phone:</strong> {selectedReport.patientId?.phone}</p>
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
                      {selectedReport.findings.map((finding, index) => (
                        <div key={index} className="mb-2">
                          <strong>{finding.testName}:</strong> {finding.result} {finding.unit} 
                          <Badge bg={finding.status === 'Normal' ? 'success' : finding.status === 'Abnormal' ? 'warning' : 'danger'} className="ms-2">
                            {finding.status}
                          </Badge>
                        </div>
                      ))}
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

export default ReportList;
