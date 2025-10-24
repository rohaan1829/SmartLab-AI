import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { patientAPI } from '../../services/api';
import { format } from 'date-fns';

const PatientList = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      };
      
      const response = await patientAPI.getAll(params);
      setPatients(response.data.patients);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Error fetching patients');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleDelete = async (patientId) => {
    try {
      await patientAPI.delete(patientId);
      toast.success('Patient deleted successfully');
      fetchPatients();
      setShowDeleteModal(false);
      setPatientToDelete(null);
    } catch (error) {
      toast.error('Error deleting patient');
      console.error('Error:', error);
    }
  };

  const handleDeleteClick = (patient) => {
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (patientToDelete) {
      handleDelete(patientToDelete._id);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPatients();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'success', text: 'Active' },
      inactive: { variant: 'secondary', text: 'Inactive' },
      suspended: { variant: 'danger', text: 'Suspended' }
    };
    const config = statusConfig[status] || { variant: 'secondary', text: 'Unknown' };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const canManagePatients = hasRole('superadmin') || hasRole('receptionist');
  const canDeletePatients = hasRole('superadmin');

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
            <i className="fas fa-user-friends me-2"></i>
            Patients Management
          </h2>
          <p className="text-muted">
            {hasRole('superadmin') && 'Complete patient management system'}
            {hasRole('receptionist') && 'Manage patient information and appointments'}
            {hasRole('patient') && 'View your profile information'}
          </p>
        </Col>
        {canManagePatients && (
          <Col className="text-end">
            <Button as={Link} to="/patients/new" variant="primary">
              <i className="fas fa-user-plus me-2"></i>
              Add New Patient
            </Button>
          </Col>
        )}
      </Row>

      {canManagePatients && (
        <Card className="mb-4">
          <Card.Body>
            <Form onSubmit={handleSearch}>
              <Row>
                <Col md={6}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search patients by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button type="submit" variant="outline-secondary">
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setCurrentPage(1);
                      fetchPatients();
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
      )}

      {patients.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="fas fa-info-circle me-2"></i>
          No patients found.
          {canManagePatients && (
            <div className="mt-2">
              <Button as={Link} to="/patients/new" variant="primary" size="sm">
                Add First Patient
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
                    Patients List ({patients.length} total)
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
                      Name
                    </th>
                    <th>
                      <i className="fas fa-envelope me-1"></i>
                      Email
                    </th>
                    <th>
                      <i className="fas fa-phone me-1"></i>
                      Phone
                    </th>
                    <th>
                      <i className="fas fa-birthday-cake me-1"></i>
                      Date of Birth
                    </th>
                    <th>
                      <i className="fas fa-venus-mars me-1"></i>
                      Gender
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-1"></i>
                      Status
                    </th>
                    {canManagePatients && (
                      <th>
                        <i className="fas fa-cogs me-1"></i>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id}>
                      <td>
                        <div>
                          <strong>{patient.firstName} {patient.lastName}</strong>
                          {patient.age && (
                            <div className="text-muted small">
                              Age: {patient.age}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${patient.email}`} className="text-decoration-none">
                          {patient.email}
                        </a>
                      </td>
                      <td>
                        {patient.phone ? (
                          <a href={`tel:${patient.phone}`} className="text-decoration-none">
                            {patient.phone}
                          </a>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {patient.dateOfBirth ? (
                          format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {patient.gender || <span className="text-muted">N/A</span>}
                      </td>
                      <td>
                        {getStatusBadge(patient.status)}
                      </td>
                      {canManagePatients && (
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/patients/${patient._id}/edit`}
                              variant="outline-primary"
                              size="sm"
                              title="Edit Patient"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              as={Link}
                              to={`/patients/${patient._id}/appointments`}
                              variant="outline-info"
                              size="sm"
                              title="View Appointments"
                            >
                              <i className="fas fa-calendar"></i>
                            </Button>
                            {canDeletePatients && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteClick(patient)}
                                title="Delete Patient"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle text-warning me-2"></i>
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this patient?</p>
          {patientToDelete && (
            <div className="alert alert-warning">
              <strong>Patient:</strong> {patientToDelete.firstName} {patientToDelete.lastName}<br />
              <strong>Email:</strong> {patientToDelete.email}
            </div>
          )}
          <p className="text-danger">
            <i className="fas fa-warning me-1"></i>
            This action cannot be undone and will permanently remove all patient data.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            <i className="fas fa-trash me-1"></i>
            Delete Patient
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PatientList;
