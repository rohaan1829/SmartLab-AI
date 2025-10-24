import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../services/api';
import activityLogger from '../utils/activityLogger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const fetchUserData = useCallback(async (authToken) => {
    try {
      const response = await authAPI.getMe(authToken);
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Token might be expired, clear it
      setUser(null);
      setToken(null);
      Cookies.remove('jwt');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for existing token on app load
    const savedToken = Cookies.get('jwt') || localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    } else {
      setLoading(false);
    }
  }, [fetchUserData]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token: newToken, data } = response.data;
      
      setToken(newToken);
      setUser(data.user);
      
      // Store token in both cookie and localStorage
      Cookies.set('jwt', newToken, { expires: 7 });
      localStorage.setItem('token', newToken);
      
      // Log successful login (non-blocking)
      setTimeout(() => {
        activityLogger.logLogin(email, true);
      }, 100);
      
      return { success: true };
    } catch (error) {
      // Log failed login
      activityLogger.logLogin(email, false, error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token: newToken, data } = response.data;
      
      setToken(newToken);
      setUser(data.user);
      
      // Store token in both cookie and localStorage
      Cookies.set('jwt', newToken, { expires: 7 });
      localStorage.setItem('token', newToken);
      
      // Log successful registration (non-blocking)
      setTimeout(() => {
        activityLogger.logRegistration(userData.email, userData.role, true);
      }, 100);
      
      return { success: true };
    } catch (error) {
      // Log failed registration
      activityLogger.logRegistration(userData.email, userData.role, false, error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors || []
      };
    }
  };

  const logout = () => {
    // Log logout before clearing user data
    if (user) {
      activityLogger.logLogout(user.email);
    }
    
    setUser(null);
    setToken(null);
    Cookies.remove('jwt');
    localStorage.removeItem('token');
    
    // Call logout API to invalidate token on server
    authAPI.logout().catch(console.error);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData, token);
      setUser(response.data.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed'
      };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData, token);
      const { token: newToken, data } = response.data;
      
      setToken(newToken);
      setUser(data.user);
      
      // Update stored token
      Cookies.set('jwt', newToken, { expires: 7 });
      localStorage.setItem('token', newToken);
      
      // Log successful password change
      activityLogger.logPasswordChange(user.email, true);
      
      return { success: true };
    } catch (error) {
      // Log failed password change
      activityLogger.logPasswordChange(user.email, false, error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Password change failed'
      };
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    const permissions = {
      superadmin: ['all'],
      receptionist: [
        'patients:read', 'patients:write', 'patients:approve',
        'appointments:read', 'appointments:write', 'appointments:approve',
        'reports:read', 'reports:write', 'reports:approve',
        'payments:read', 'payments:write', 'payments:approve',
        'complaints:read', 'complaints:write', 'complaints:approve',
        'home_collection:read', 'home_collection:write', 'home_collection:approve'
      ],
      patient: [
        'profile:read', 'profile:write',
        'appointments:read', 'appointments:write', 'appointments:cancel',
        'reports:read', 'reports:download',
        'payments:read', 'payments:write',
        'complaints:write',
        'home_collection:request'
      ]
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  // AI Bot Integration Helper Methods
  const getAICommunicationPrefs = () => {
    if (!user) return null;
    return user.aiPreferences || {
      language: 'en',
      timezone: 'UTC',
      communicationStyle: 'friendly',
      notifications: { email: true, sms: false, push: true }
    };
  };

  const addAIInteraction = async (interactionType, query, response, satisfaction = null) => {
    if (!user) return false;
    
    try {
      // This would call an API endpoint to add AI interaction
      // For now, we'll just log it locally
      console.log('AI Interaction:', { interactionType, query, response, satisfaction });
      return true;
    } catch (error) {
      console.error('Error adding AI interaction:', error);
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasRole,
    hasPermission,
    getAICommunicationPrefs,
    addAIInteraction,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
