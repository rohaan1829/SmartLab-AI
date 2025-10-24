// Frontend Activity Logger
class ActivityLogger {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.isEnabled = process.env.NODE_ENV === 'production' || true; // Enable in both dev and prod
  }

  // Log user activity
  logActivity = (activity, details = {}) => {
    if (!this.isEnabled) return;

    const logData = {
      activity,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    // Send to backend logging endpoint
    this.sendToBackend(logData);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ACTIVITY] ${activity}:`, logData);
    }
  };

  // Authentication activities
  logLogin = (email, success = true, error = null) => {
    this.logActivity('USER_LOGIN', {
      email,
      success,
      error: error ? error.message : null,
      ip: this.getClientIP()
    });
  };

  logLogout = (email) => {
    this.logActivity('USER_LOGOUT', {
      email,
      ip: this.getClientIP()
    });
  };

  logRegistration = (email, role, success = true, error = null) => {
    this.logActivity('USER_REGISTRATION', {
      email,
      role,
      success,
      error: error ? error.message : null,
      ip: this.getClientIP()
    });
  };

  logPasswordChange = (email, success = true, error = null) => {
    this.logActivity('PASSWORD_CHANGE', {
      email,
      success,
      error: error ? error.message : null,
      ip: this.getClientIP()
    });
  };

  // CRUD activities
  logCreate = (resource, resourceId, data) => {
    this.logActivity('CREATE_RESOURCE', {
      resource,
      resourceId,
      dataKeys: data ? Object.keys(data) : [],
      ip: this.getClientIP()
    });
  };

  logUpdate = (resource, resourceId, changes) => {
    this.logActivity('UPDATE_RESOURCE', {
      resource,
      resourceId,
      changesKeys: changes ? Object.keys(changes) : [],
      ip: this.getClientIP()
    });
  };

  logDelete = (resource, resourceId) => {
    this.logActivity('DELETE_RESOURCE', {
      resource,
      resourceId,
      ip: this.getClientIP()
    });
  };

  logRead = (resource, resourceId = null) => {
    this.logActivity('READ_RESOURCE', {
      resource,
      resourceId,
      ip: this.getClientIP()
    });
  };

  // Navigation activities
  logNavigation = (from, to) => {
    this.logActivity('NAVIGATION', {
      from,
      to,
      ip: this.getClientIP()
    });
  };

  // Search activities
  logSearch = (resource, query, resultsCount) => {
    this.logActivity('SEARCH', {
      resource,
      query,
      resultsCount,
      ip: this.getClientIP()
    });
  };

  // Error activities
  logError = (error, context = {}) => {
    this.logActivity('ERROR', {
      error: error.message,
      stack: error.stack,
      context,
      ip: this.getClientIP()
    });
  };

  // Security activities
  logSecurityEvent = (event, details = {}) => {
    this.logActivity('SECURITY_EVENT', {
      event,
      ...details,
      ip: this.getClientIP()
    });
  };

  // Helper methods
  getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user ? user._id : null;
    } catch {
      return null;
    }
  };

  getSessionId = () => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  getClientIP = () => {
    // This would typically be handled by the backend
    // For now, we'll return a placeholder
    return 'client_ip';
  };

  sendToBackend = async (logData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiUrl}/logs/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(logData),
        mode: 'cors'
      });

      if (!response.ok) {
        console.warn('Failed to send activity log to backend');
      }
    } catch (error) {
      console.warn('Error sending activity log:', error);
    }
  };
}

// Create singleton instance
const activityLogger = new ActivityLogger();

// Export for use in components
export default activityLogger;

// Export individual methods for convenience
export const {
  logActivity,
  logLogin,
  logLogout,
  logRegistration,
  logPasswordChange,
  logCreate,
  logUpdate,
  logDelete,
  logRead,
  logNavigation,
  logSearch,
  logError,
  logSecurityEvent
} = activityLogger;
