import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PatientList from './components/patients/PatientList';
import PatientForm from './components/patients/PatientForm';
import AppointmentList from './components/appointments/AppointmentList';
import AppointmentForm from './components/appointments/AppointmentForm';
import ReportList from './components/reports/ReportList';
import ReportForm from './components/reports/ReportForm';
import PaymentList from './components/payments/PaymentList';
import PaymentForm from './components/payments/PaymentForm';
import PaymentProcessing from './components/payments/PaymentProcessing';
import PatientPayments from './components/payments/PatientPayments';
import RefundManagement from './components/payments/RefundManagement';
import ComplaintList from './components/complaints/ComplaintList';
import ComplaintForm from './components/complaints/ComplaintForm';
import PendingComplaints from './components/complaints/PendingComplaints';
import PatientComplaints from './components/complaints/PatientComplaints';
import ComplaintManagement from './components/complaints/ComplaintManagement';
import Profile from './components/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container-fluid">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* User Management Routes (SuperAdmin only) */}
              <Route path="/users" element={
                <ProtectedRoute requiredRoles={['superadmin']}>
                  <div className="container mt-4">
                    <h2>User Management</h2>
                    <p>User management interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Patient Routes */}
              <Route path="/patients" element={
                <ProtectedRoute requiredPermissions={['patients:read']}>
                  <PatientList />
                </ProtectedRoute>
              } />
              <Route path="/patients/new" element={
                <ProtectedRoute requiredPermissions={['patients:write']}>
                  <PatientForm />
                </ProtectedRoute>
              } />
              <Route path="/patients/:id/edit" element={
                <ProtectedRoute requiredPermissions={['patients:write']}>
                  <PatientForm />
                </ProtectedRoute>
              } />
              <Route path="/patients/me" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <div className="container mt-4">
                    <h2>My Profile</h2>
                    <p>Patient self-service profile management will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Appointment Routes */}
              <Route path="/appointments" element={
                <ProtectedRoute requiredPermissions={['appointments:read']}>
                  <AppointmentList />
                </ProtectedRoute>
              } />
              <Route path="/appointments/my" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <div className="container mt-4">
                    <h2>My Appointments</h2>
                    <p>Patient appointment management will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/appointments/pending" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <div className="container mt-4">
                    <h2>Pending Appointments</h2>
                    <p>Appointment approval interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/appointments/new" element={
                <ProtectedRoute requiredPermissions={['appointments:write']}>
                  <AppointmentForm />
                </ProtectedRoute>
              } />
              <Route path="/appointments/:id/edit" element={
                <ProtectedRoute requiredPermissions={['appointments:write']}>
                  <AppointmentForm />
                </ProtectedRoute>
              } />
              <Route path="/appointments/:id/approve" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <div className="container mt-4">
                    <h2>Approve Appointment</h2>
                    <p>Appointment approval interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/appointments/:id/reject" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <div className="container mt-4">
                    <h2>Reject Appointment</h2>
                    <p>Appointment rejection interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Report Routes */}
              <Route path="/reports" element={
                <ProtectedRoute requiredPermissions={['reports:read']}>
                  <ReportList />
                </ProtectedRoute>
              } />
              <Route path="/reports/my" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <div className="container mt-4">
                    <h2>My Reports</h2>
                    <p>Patient report management will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/reports/pending" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <div className="container mt-4">
                    <h2>Pending Reports</h2>
                    <p>Report review interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/reports/new" element={
                <ProtectedRoute requiredPermissions={['reports:write']}>
                  <ReportForm />
                </ProtectedRoute>
              } />
              <Route path="/reports/:id/edit" element={
                <ProtectedRoute requiredPermissions={['reports:write']}>
                  <ReportForm />
                </ProtectedRoute>
              } />
              <Route path="/reports/:id/download" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <div className="container mt-4">
                    <h2>Download Report</h2>
                    <p>Report download interface will be implemented here.</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Payment Routes */}
              <Route path="/payments" element={
                <ProtectedRoute requiredPermissions={['payments:read']}>
                  <PaymentList />
                </ProtectedRoute>
              } />
              <Route path="/payments/my" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <PatientPayments />
                </ProtectedRoute>
              } />
              <Route path="/payments/new" element={
                <ProtectedRoute requiredPermissions={['payments:write']}>
                  <PaymentForm />
                </ProtectedRoute>
              } />
              <Route path="/payments/:id/edit" element={
                <ProtectedRoute requiredPermissions={['payments:write']}>
                  <PaymentForm />
                </ProtectedRoute>
              } />
              <Route path="/payments/refunds" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <RefundManagement />
                </ProtectedRoute>
              } />
              
              {/* Complaint Routes */}
              <Route path="/complaints" element={
                <ProtectedRoute requiredPermissions={['complaints:read']}>
                  <ComplaintList />
                </ProtectedRoute>
              } />
              <Route path="/complaints/my" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <PatientComplaints />
                </ProtectedRoute>
              } />
              <Route path="/complaints/new" element={
                <ProtectedRoute requiredRoles={['patient']}>
                  <ComplaintForm />
                </ProtectedRoute>
              } />
              <Route path="/complaints/pending" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <PendingComplaints />
                </ProtectedRoute>
              } />
              <Route path="/complaints/management" element={
                <ProtectedRoute requiredRoles={['superadmin', 'receptionist']}>
                  <ComplaintManagement />
                </ProtectedRoute>
              } />
              <Route path="/complaints/:id/edit" element={
                <ProtectedRoute requiredPermissions={['complaints:write']}>
                  <ComplaintForm />
                </ProtectedRoute>
              } />
              
              {/* Profile Route */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* 404 Route */}
              <Route path="*" element={
                <div className="container mt-5">
                  <div className="row justify-content-center">
                    <div className="col-md-6">
                      <div className="alert alert-warning text-center">
                        <h4>Page Not Found</h4>
                        <p>The page you're looking for doesn't exist.</p>
                        <a href="/dashboard" className="btn btn-primary">Go to Dashboard</a>
                      </div>
                    </div>
                  </div>
                </div>
              } />
            </Routes>
          </div>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
