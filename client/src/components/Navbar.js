import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navigation = () => {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="/">
          <i className="fas fa-flask me-2"></i>
          SmartLab AI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {user ? (
            <>
              <Nav className="me-auto">
                <LinkContainer to="/dashboard">
                  <Nav.Link>
                    <i className="fas fa-tachometer-alt me-1"></i>
                    Dashboard
                  </Nav.Link>
                </LinkContainer>
                
                {/* Role-based navigation */}
                {hasRole('superadmin') && (
                  <>
                    <LinkContainer to="/users">
                      <Nav.Link>
                        <i className="fas fa-users me-1"></i>
                        Users
                      </Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/patients">
                      <Nav.Link>
                        <i className="fas fa-user-friends me-1"></i>
                        Patients
                      </Nav.Link>
                    </LinkContainer>
                  </>
                )}
                
                {hasRole('receptionist') && (
                  <LinkContainer to="/patients">
                    <Nav.Link>
                      <i className="fas fa-user-friends me-1"></i>
                      Patients
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {hasPermission('appointments:read') && (
                  <LinkContainer to="/appointments">
                    <Nav.Link>
                      <i className="fas fa-calendar-alt me-1"></i>
                      Appointments
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {hasPermission('reports:read') && (
                  <LinkContainer to="/reports">
                    <Nav.Link>
                      <i className="fas fa-file-medical me-1"></i>
                      Reports
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {hasPermission('payments:read') && (
                  <LinkContainer to="/payments">
                    <Nav.Link>
                      <i className="fas fa-credit-card me-1"></i>
                      Payments
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {(hasRole('superadmin') || hasRole('receptionist')) && (
                  <LinkContainer to="/payments/refunds">
                    <Nav.Link>
                      <i className="fas fa-undo me-1"></i>
                      Refunds
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {hasPermission('complaints:read') && (
                  <LinkContainer to="/complaints">
                    <Nav.Link>
                      <i className="fas fa-comments me-1"></i>
                      Complaints
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {(hasRole('superadmin') || hasRole('receptionist')) && (
                  <LinkContainer to="/complaints/pending">
                    <Nav.Link>
                      <i className="fas fa-clock me-1"></i>
                      Pending Complaints
                    </Nav.Link>
                  </LinkContainer>
                )}
                
                {(hasRole('superadmin') || hasRole('receptionist')) && (
                  <LinkContainer to="/complaints/management">
                    <Nav.Link>
                      <i className="fas fa-cogs me-1"></i>
                      Complaint Management
                    </Nav.Link>
                  </LinkContainer>
                )}
              </Nav>
              
              <Nav>
                <NavDropdown 
                  title={
                    <span>
                      <i className="fas fa-user-circle me-1"></i>
                      {user.firstName} {user.lastName}
                    </span>
                  } 
                  id="user-dropdown"
                >
                  <NavDropdown.Item as={LinkContainer} to="/profile">
                    <i className="fas fa-user me-2"></i>
                    Profile
                  </NavDropdown.Item>
                  
                  {hasRole('superadmin') && (
                    <NavDropdown.Item as={LinkContainer} to="/users">
                      <i className="fas fa-users-cog me-2"></i>
                      Manage Users
                    </NavDropdown.Item>
                  )}
                  
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <LinkContainer to="/login">
                <Nav.Link>
                  <i className="fas fa-sign-in-alt me-1"></i>
                  Login
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/register">
                <Nav.Link>
                  <i className="fas fa-user-plus me-1"></i>
                  Register
                </Nav.Link>
              </LinkContainer>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
