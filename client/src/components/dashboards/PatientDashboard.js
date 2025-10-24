import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Button, Badge, Table, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { patientAPI, appointmentAPI, reportAPI, paymentAPI, complaintAPI } from '../../services/api';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    appointments: 0,
    reports: 0,
    payments: 0,
    complaints: 0,
    loading: true
  });

  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          appointmentsRes,
          reportsRes,
          paymentsRes,
          complaintsRes,
          upcomingRes
        ] = await Promise.all([
          appointmentAPI.getMy(),
          reportAPI.getMy(),
          paymentAPI.getMy(),
          complaintAPI.getMy(),
          appointmentAPI.getMy({ status: 'Approved' })
        ]);

        setStats({
          appointments: appointmentsRes.data.length,
          reports: reportsRes.data.length,
          payments: paymentsRes.data.length,
          complaints: complaintsRes.data.length,
          loading: false
        });

        setRecentAppointments(appointmentsRes.data.slice(0, 5));
        setRecentReports(reportsRes.data.slice(0, 5));
        setRecentPayments(paymentsRes.data.slice(0, 5));
        setUpcomingAppointments(upcomingRes.data.filter(apt => 
          new Date(apt.appointmentDate) >= new Date()
        ).slice(0, 5));
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
          <p className="text-muted">Patient Dashboard - Manage your appointments, reports, and payments</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center border-primary">
            <Card.Body>
              <Card.Title className="text-primary">
                <i className="fas fa-calendar-check me-2"></i>
                Appointments
              </Card.Title>
              <Card.Text className="display-6 text-primary">{stats.appointments}</Card.Text>
              <small className="text-muted">Total appointments</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-success">
            <Card.Body>
              <Card.Title className="text-success">
                <i className="fas fa-file-medical me-2"></i>
                Reports
              </Card.Title>
              <Card.Text className="display-6 text-success">{stats.reports}</Card.Text>
              <small className="text-muted">Total reports</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-warning">
            <Card.Body>
              <Card.Title className="text-warning">
                <i className="fas fa-credit-card me-2"></i>
                Payments
              </Card.Title>
              <Card.Text className="display-6 text-warning">{stats.payments}</Card.Text>
              <small className="text-muted">Total payments</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center border-info">
            <Card.Body>
              <Card.Title className="text-info">
                <i className="fas fa-comments me-2"></i>
                Complaints
              </Card.Title>
              <Card.Text className="display-6 text-info">{stats.complaints}</Card.Text>
              <small className="text-muted">Total complaints</small>
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
                      <th>Type</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppointments.map((appointment) => (
                      <tr key={appointment._id}>
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

      {/* Recent Reports */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-file-medical me-2"></i>
                Recent Reports
              </h5>
            </Card.Header>
            <Card.Body>
              {recentReports.length > 0 ? (
                <div className="d-grid gap-2">
                  {recentReports.map((report) => (
                    <div key={report._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                      <div>
                        <small className="fw-bold">{report.reportType}</small>
                        <br />
                        <small className="text-muted">{new Date(report.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div>
                        <Badge bg={report.status === 'Approved' ? 'success' : 'warning'}>{report.status}</Badge>
                        {report.status === 'Approved' && (
                          <Button variant="outline-primary" size="sm" className="ms-2" as={Link} to={`/reports/${report._id}/download`}>
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline-primary" size="sm" as={Link} to="/reports">
                    View All Reports
                  </Button>
                </div>
              ) : (
                <Alert variant="info" className="text-center">
                  No reports available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Payments */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-credit-card me-2"></i>
                Recent Payments
              </h5>
            </Card.Header>
            <Card.Body>
              {recentPayments.length > 0 ? (
                <div className="d-grid gap-2">
                  {recentPayments.map((payment) => (
                    <div key={payment._id} className="d-flex justify-content-between align-items-center p-2 border rounded">
                      <div>
                        <small className="fw-bold">${payment.amount}</small>
                        <br />
                        <small className="text-muted">{new Date(payment.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div>
                        <Badge bg={payment.paymentStatus === 'Paid' ? 'success' : 'warning'}>{payment.paymentStatus}</Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline-primary" size="sm" as={Link} to="/payments">
                    View All Payments
                  </Button>
                </div>
              ) : (
                <Alert variant="info" className="text-center">
                  No payments available
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
                  <Button variant="primary" className="w-100" as={Link} to="/appointments/new">
                    <i className="fas fa-calendar-plus me-2"></i>
                    Book Appointment
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="success" className="w-100" as={Link} to="/appointments">
                    <i className="fas fa-calendar-check me-2"></i>
                    View Appointments
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="warning" className="w-100" as={Link} to="/reports">
                    <i className="fas fa-file-medical me-2"></i>
                    View Reports
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button variant="info" className="w-100" as={Link} to="/complaints/new">
                    <i className="fas fa-comment me-2"></i>
                    Submit Complaint
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
                Personal Information
              </h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover size="sm">
                <tbody>
                  <tr>
                    <td><strong>Role:</strong></td>
                    <td><Badge bg="primary">Patient</Badge></td>
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
                    <td><strong>Phone:</strong></td>
                    <td>{user?.phone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Date of Birth:</strong></td>
                    <td>{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Gender:</strong></td>
                    <td>{user?.gender || 'N/A'}</td>
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
                Your Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="text-center">
                  <h4 className="text-primary">{stats.appointments}</h4>
                  <small className="text-muted">Total Appointments</small>
                </Col>
                <Col md={6} className="text-center">
                  <h4 className="text-success">{stats.reports}</h4>
                  <small className="text-muted">Total Reports</small>
                </Col>
              </Row>
              <hr />
              <Row>
                <Col md={6} className="text-center">
                  <h4 className="text-warning">{stats.payments}</h4>
                  <small className="text-muted">Total Payments</small>
                </Col>
                <Col md={6} className="text-center">
                  <h4 className="text-info">{stats.complaints}</h4>
                  <small className="text-muted">Total Complaints</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PatientDashboard;
