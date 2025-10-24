import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Button, Badge, Table, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { patientAPI, appointmentAPI, reportAPI, paymentAPI, complaintAPI } from '../../services/api';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    reports: 0,
    payments: 0,
    complaints: 0,
    pendingApprovals: 0,
    loading: true
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingItems, setPendingItems] = useState({
    appointments: [],
    reports: [],
    complaints: []
  });

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          patientsRes,
          appointmentsRes,
          reportsRes,
          paymentsRes,
          complaintsRes,
          pendingAppointmentsRes,
          pendingReportsRes,
          pendingComplaintsRes,
          upcomingRes
        ] = await Promise.all([
          patientAPI.getAll({ limit: 1 }),
          appointmentAPI.getAll({ limit: 1 }),
          reportAPI.getAll({ limit: 1 }),
          paymentAPI.getAll({ limit: 1 }),
          complaintAPI.getAll({ limit: 1 }),
          appointmentAPI.getAll({ status: 'Pending', limit: 5 }),
          reportAPI.getAll({ status: 'Pending Review', limit: 5 }),
          complaintAPI.getAll({ status: 'Open', limit: 5 }),
          appointmentAPI.getAll({ status: 'Approved', limit: 10 })
        ]);

        setStats({
          patients: patientsRes.data.total,
          appointments: appointmentsRes.data.total,
          reports: reportsRes.data.total,
          payments: paymentsRes.data.total,
          complaints: complaintsRes.data.total,
          pendingApprovals: pendingAppointmentsRes.data.total + pendingReportsRes.data.total + pendingComplaintsRes.data.total,
          loading: false
        });

        setPendingItems({
          appointments: pendingAppointmentsRes.data.appointments || [],
          reports: pendingReportsRes.data.reports || [],
          complaints: pendingComplaintsRes.data.complaints || []
        });

        setUpcomingAppointments(upcomingRes.data.appointments || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  if (stats.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <h2>Welcome back, {user?.firstName}!</h2>
          <p className="text-muted">Receptionist Dashboard - Manage patients, appointments, and approvals</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center border-primary">
            <Card.Body>
              <Card.Title className="text-primary">
                <i className="fas fa-users me-2"></i>
                Patients
              </Card.Title>
              <Card.Text className="display-6 text-primary">{stats.patients}</Card.Text>
              <small className="text-muted">Total patients</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-success">
            <Card.Body>
              <Card.Title className="text-success">
                <i className="fas fa-calendar-check me-2"></i>
                Appointments
              </Card.Title>
              <Card.Text className="display-6 text-success">{stats.appointments}</Card.Text>
              <small className="text-muted">Total appointments</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-warning">
            <Card.Body>
              <Card.Title className="text-warning">
                <i className="fas fa-file-medical me-2"></i>
                Reports
              </Card.Title>
              <Card.Text className="display-6 text-warning">{stats.reports}</Card.Text>
              <small className="text-muted">Total reports</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-danger">
            <Card.Body>
              <Card.Title className="text-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Pending Approvals
              </Card.Title>
              <Card.Text className="display-6 text-danger">{stats.pendingApprovals}</Card.Text>
              <small className="text-muted">Require attention</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Approvals Section */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="border-warning">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">
                <i className="fas fa-clock me-2"></i>
                Pending Approvals
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">Pending Appointments</h6>
                    </Card.Header>
                    <Card.Body>
                      {pendingItems.appointments.length > 0 ? (
                        <div className="d-grid gap-2">
                          {pendingItems.appointments.slice(0, 3).map((appointment) => (
                            <div key={appointment._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                              <div>
                                <small className="fw-bold">{appointment.patientId?.firstName} {appointment.patientId?.lastName}</small>
                                <br />
                                <small className="text-muted">{appointment.type}</small>
                              </div>
                              <Badge bg="warning">{appointment.status}</Badge>
                            </div>
                          ))}
                          <Button variant="outline-primary" size="sm" as={Link} to="/appointments?status=Pending">
                            View All Pending
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted text-center">No pending appointments</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">Pending Reports</h6>
                    </Card.Header>
                    <Card.Body>
                      {pendingItems.reports.length > 0 ? (
                        <div className="d-grid gap-2">
                          {pendingItems.reports.slice(0, 3).map((report) => (
                            <div key={report._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                              <div>
                                <small className="fw-bold">{report.patientId?.firstName} {report.patientId?.lastName}</small>
                                <br />
                                <small className="text-muted">{report.reportType}</small>
                              </div>
                              <Badge bg="warning">{report.status}</Badge>
                            </div>
                          ))}
                          <Button variant="outline-primary" size="sm" as={Link} to="/reports?status=Pending Review">
                            View All Pending
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted text-center">No pending reports</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">Open Complaints</h6>
                    </Card.Header>
                    <Card.Body>
                      {pendingItems.complaints.length > 0 ? (
                        <div className="d-grid gap-2">
                          {pendingItems.complaints.slice(0, 3).map((complaint) => (
                            <div key={complaint._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                              <div>
                                <small className="fw-bold">{complaint.patientId?.firstName} {complaint.patientId?.lastName}</small>
                                <br />
                                <small className="text-muted">{complaint.subject}</small>
                              </div>
                              <Badge bg="danger">{complaint.priority}</Badge>
                            </div>
                          ))}
                          <Button variant="outline-primary" size="sm" as={Link} to="/complaints?status=Open">
                            View All Open
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted text-center">No open complaints</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Appointments */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-calendar-alt me-2"></i>
                Upcoming Appointments
              </h5>
            </Card.Header>
            <Card.Body>
              {upcomingAppointments.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppointments.slice(0, 5).map((appointment) => (
                      <tr key={appointment._id}>
                        <td>{appointment.patientId?.firstName} {appointment.patientId?.lastName}</td>
                        <td>{appointment.type}</td>
                        <td>{new Date(appointment.appointmentDate).toLocaleDateString()}</td>
                        <td>{appointment.appointmentTime}</td>
                        <td><Badge bg="success">{appointment.status}</Badge></td>
                        <td>
                          <Button variant="outline-primary" size="sm" as={Link} to={`/appointments/${appointment._id}`}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info" className="text-center">
                  No upcoming appointments scheduled
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-2">
                  <Button variant="primary" className="w-100" as={Link} to="/patients/new">
                    <i className="fas fa-user-plus me-2"></i>
                    Add Patient
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="success" className="w-100" as={Link} to="/appointments/new">
                    <i className="fas fa-calendar-plus me-2"></i>
                    Schedule Appointment
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="warning" className="w-100" as={Link} to="/appointments/pending">
                    <i className="fas fa-calendar-check me-2"></i>
                    Review Appointments
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="info" className="w-100" as={Link} to="/reports/pending">
                    <i className="fas fa-file-medical me-2"></i>
                    Review Reports
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Information */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-info-circle me-2"></i>
                User Information
              </h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover size="sm">
                <tbody>
                  <tr>
                    <td><strong>Role:</strong></td>
                    <td><Badge bg="success">Receptionist</Badge></td>
                  </tr>
                  <tr>
                    <td><strong>Name:</strong></td>
                    <td>{user?.firstName} {user?.lastName}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>{user?.email}</td>
                  </tr>
                  <tr>
                    <td><strong>Department:</strong></td>
                    <td>{user?.department || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Employee ID:</strong></td>
                    <td>{user?.employeeId || 'N/A'}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-chart-bar me-2"></i>
                Today's Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="text-center">
                  <h4 className="text-primary">{stats.patients}</h4>
                  <small className="text-muted">Total Patients</small>
                </Col>
                <Col md={6} className="text-center">
                  <h4 className="text-success">{stats.appointments}</h4>
                  <small className="text-muted">Total Appointments</small>
                </Col>
              </Row>
              <hr />
              <Row>
                <Col md={6} className="text-center">
                  <h4 className="text-warning">{stats.reports}</h4>
                  <small className="text-muted">Total Reports</small>
                </Col>
                <Col md={6} className="text-center">
                  <h4 className="text-info">{stats.payments}</h4>
                  <small className="text-muted">Total Payments</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReceptionistDashboard;
