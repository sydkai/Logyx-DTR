import api from './axios';
export const getRecords = (params) => api.get('/records', { params });
export const createRecord = (data) => api.post('/records', data);
export const deleteRecord = (id) => api.delete(`/records/${id}`);
export const getTodaySummary = (date) =>
  api.get('/records/today', { params: date ? { date } : {} });

function toPageRecord(r) {
  const TYPE_FROM_SERVER = {
    IN: 'TIME IN',
    'LUNCH-OUT': 'LUNCH OUT',
    'LUNCH-IN': 'TIME IN',
    OUT: 'TIME OUT',
    'OT-IN': 'OVERTIME',
    'OT-OUT': 'OVERTIME',
    ABSENT: 'ABSENT',
  };
  return {
    id: r.id,
    employee_id: r.emp_id,
    name: r.name,
    type: r.type,
    date: r.raw_date,
    time: r.time,
    record_type: TYPE_FROM_SERVER[r.type] || r.type,
    day: r.day,
    status: r.status,
    ts: r.ts,
  };
}

export async function getTodayRecords(date) {
  const res = await getTodaySummary(date);
  return (res.data || []).map(toPageRecord);
}