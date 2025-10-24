import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || Cookies.get('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      Cookies.remove('jwt');
      // Don't redirect automatically, let components handle it
    }
    return Promise.reject(error);
  }
);

// Patient API
export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  getAppointments: (id) => api.get(`/patients/${id}/appointments`),
  // New endpoints for role-based access
  getMe: () => api.get('/patients/me'),
  updateMe: (data) => api.patch('/patients/me', data),
  getMyAppointments: () => api.get('/patients/me/appointments'),
};

// Appointment API
export const appointmentAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  getUpcoming: (receptionistId, limit) => api.get(`/appointments/upcoming/${receptionistId}`, { params: { limit } }),
  // New endpoints for role-based access
  getMy: (params) => api.get('/appointments/my', { params }),
  getPending: () => api.get('/appointments/pending'),
  approve: (id, data) => api.post(`/appointments/${id}/approve`, data),
  reject: (id, data) => api.post(`/appointments/${id}/reject`, data),
  requestHomeCollection: (id, data) => api.post(`/appointments/${id}/home-collection`, data),
  approveHomeCollection: (id, data) => api.patch(`/appointments/${id}/home-collection/approve`, data),
};

// Report API
export const reportAPI = {
  getAll: (params) => api.get('/reports', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  updateStatus: (id, status, reviewedBy) => api.patch(`/reports/${id}/status`, { status, reviewedBy }),
  getByPatient: (patientId, params) => api.get(`/reports/patient/${patientId}`, { params }),
  addAttachment: (id, data) => api.post(`/reports/${id}/attachments`, data),
  // New endpoints for role-based access
  getMy: (params) => api.get('/reports/my', { params }),
  getPending: () => api.get('/reports/pending'),
  getPatientMe: () => api.get('/reports/patient/me'),
  download: (id) => api.get(`/reports/${id}/download`),
};

// Payment API
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  updateStatus: (id, paymentStatus, paymentDetails) => api.patch(`/payments/${id}/status`, { paymentStatus, paymentDetails }),
  getByPatient: (patientId, params) => api.get(`/payments/patient/${patientId}`, { params }),
  getOverdue: () => api.get('/payments/overdue'),
  processRefund: (id, data) => api.post(`/payments/${id}/refund`, data),
  getStats: (params) => api.get('/payments/stats/summary', { params }),
  // New endpoints for role-based access
  getMy: (params) => api.get('/payments/my', { params }),
  getPatientMe: () => api.get('/payments/patient/me'),
  // Refund management endpoints
  updateRefundStatus: (id, status, processedBy) => api.patch(`/payments/${id}/refund-status`, { status, processedBy }),
  makePayment: (id, paymentData) => api.post(`/payments/${id}/make-payment`, paymentData),
  getRefunds: (params) => api.get('/payments/refunds', { params }),
};

// Complaint API
export const complaintAPI = {
  getAll: (params) => api.get('/complaints', { params }),
  getById: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
  // New endpoints for role-based access
  getMy: (params) => api.get('/complaints/my', { params }),
  getPending: () => api.get('/complaints/pending'),
  assign: (id, data) => api.patch(`/complaints/${id}/assign`, data),
  resolve: (id, data) => api.patch(`/complaints/${id}/resolve`, data),
  updatePriority: (id, data) => api.patch(`/complaints/${id}/priority`, data),
  addComment: (id, data) => api.post(`/complaints/${id}/comments`, data),
  getStats: () => api.get('/complaints/stats/summary'),
};

// Authentication API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: (token) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile: (data, token) => api.patch('/auth/update-profile', data, { headers: { Authorization: `Bearer ${token}` } }),
  changePassword: (data, token) => api.patch('/auth/change-password', data, { headers: { Authorization: `Bearer ${token}` } }),
  getUsers: (params, token) => api.get('/auth/users', { params, headers: { Authorization: `Bearer ${token}` } }),
  updateUserStatus: (id, data, token) => api.patch(`/auth/users/${id}/status`, data, { headers: { Authorization: `Bearer ${token}` } }),
  deleteUser: (id, token) => api.delete(`/auth/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
};

export default api;
