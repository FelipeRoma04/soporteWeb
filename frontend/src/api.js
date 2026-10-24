import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soporte_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Si el token vence o deja de ser válido, avisa para cerrar la sesión y volver al login.
api.interceptors.response.use((response) => response, (error) => {
  const isCredentialRequest = ['/auth/login', '/auth/register'].includes(error.config?.url);
  if (error.response?.status === 401 && !isCredentialRequest) window.dispatchEvent(new Event('soporte:session-expired'));
  return Promise.reject(error);
});
export const login = (payload) => api.post('/auth/login', payload);
export const register = (payload) => api.post('/auth/register', payload);
export const getMe = () => api.get('/auth/me');
export const changePassword = (currentPassword, newPassword) => api.patch('/auth/password', { currentPassword, newPassword });
export const getTickets = () => api.get('/tickets');
export const createTicket = (payload) => api.post('/tickets', payload);
export const getTicketComments = (ticketId) => api.get(`/tickets/${ticketId}/comments`);
export const getTicketHistory = (ticketId) => api.get(`/tickets/${ticketId}/history`);
export const addTicketComment = (ticketId, body) => api.post(`/tickets/${ticketId}/comments`, { body });
export const updateTicketStatus = (ticketId, status) => api.patch(`/tickets/${ticketId}/status`, { status });
export const askAssistant = (question, history = []) => api.post('/ai/chat', { question, history });
export const sendAssistantFeedback = (interactionId, rating) => api.post(`/ai/interactions/${interactionId}/feedback`, { rating });
export const analyzeTicket = (description) => api.post('/ai/analyze', { description });
export const getUsers = () => api.get('/users');
export const updateUserRole = (userId, role) => api.patch(`/users/${userId}/role`, { role });
export const updateUserStatus = (userId, active) => api.patch(`/users/${userId}/status`, { active });
export const getNotifications = () => api.get('/users/notifications');
export const markNotificationAsRead = (notificationId) => api.patch(`/users/notifications/${notificationId}/read`);
export const markAllNotificationsAsRead = () => api.patch('/users/notifications/read-all');
export const getCategories = () => api.get('/categories');
export const createCategory = (name) => api.post('/categories', { name });
export const getDashboard = () => api.get('/dashboard');
export const getKnowledge = () => api.get('/knowledge');
export const createKnowledge = (article) => api.post('/knowledge', article);
export const deleteCategory = (categoryId) => api.delete(`/categories/${categoryId}`);
export const rateTicket = (ticketId, rating, comment) => api.post(`/tickets/${ticketId}/rating`, { rating, comment });
export const getReportSummary = (params) => api.get('/reports/summary', { params });
export const downloadTicketsCsv = (params) => api.get('/reports/tickets.csv', { params, responseType: 'blob' });
export const downloadTicketsXlsx = (params) => api.get('/reports/tickets.xlsx', { params, responseType: 'blob' });