import api from './axios';

export const getEmployees = (params) => api.get('/employees', { params });
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (empId, data) => api.put(`/employees/${empId}`, data);
export const deleteEmployee = (empId) => api.delete(`/employees/${empId}`);

export const importEmployeesExcel = (file) => {
  const form = new FormData();
  form.append('file', file);
  // Let the browser set multipart boundary — do not set Content-Type manually.
  return api.post('/employees/import', form);
};

export const exportEmployeesExcel = () =>
  api.get('/employees/export/excel', { responseType: 'blob' });

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadEmployeesExcel() {
  const res = await exportEmployeesExcel();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(res.data, `Employee_Roster_${stamp}.xlsx`);
}
