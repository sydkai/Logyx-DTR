import api from './axios';
export const getRecords = (params) => api.get('/records', { params });
export const createRecord = (data) => api.post('/records', data);
export const deleteRecord = (id) => api.delete(`/records/${id}`);
export const getTodaySummary = (date) =>
  api.get('/records/today', { params: date ? { date } : {} });