import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soporte_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const login = (payload) => api.post('/auth/login', payload);
export const register = (payload) => api.post('/auth/register', payload);
export const getTickets = () => api.get('/tickets');
export const createTicket = (payload) => api.post('/tickets', payload);
export const updateTicketStatus = (ticketId, status) => api.patch(`/tickets/${ticketId}/status`, { status });
export const askAssistant = (question) => api.post('/ai/chat', { question });
export const getUsers = () => api.get('/users');
export const updateUserRole = (userId, role) => api.patch(`/users/${userId}/role`, { role });
export const getNotifications = () => api.get('/users/notifications');
export const markNotificationAsRead = (notificationId) => api.patch(`/users/notifications/${notificationId}/read`);
export const getCategories = () => api.get('/categories');
export const createCategory = (name) => api.post('/categories', { name });
export const getDashboard = () => api.get('/dashboard');
export const getKnowledge = () => api.get('/knowledge');
export const createKnowledge = (article) => api.post('/knowledge', article);
