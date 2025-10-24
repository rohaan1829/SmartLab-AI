import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import ReceptionistDashboard from './dashboards/ReceptionistDashboard';
import PatientDashboard from './dashboards/PatientDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  // Render role-specific dashboard
  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'superadmin':
      return <SuperAdminDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    case 'patient':
      return <PatientDashboard />;
    default:
      return (
        <div className="mt-4">
          <div className="alert alert-warning" role="alert">
            <h4 className="alert-heading">Unknown Role</h4>
            <p>Your role ({user.role}) is not recognized. Please contact the administrator.</p>
          </div>
        </div>
      );
  }
};

export default Dashboard;
