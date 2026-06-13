import http from './axios';

function getErrorMessage(err) {
  return err.response?.data?.error || err.message || 'Request failed';
}

async function request(promise) {
  try {
    return await promise;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}

function formatEmployeeName(emp) {
  const mid = emp.middle_name ? ` ${emp.middle_name.charAt(0)}.` : '';
  return `${emp.surname}, ${emp.first_name}${mid}`;
}

function toPageEmployee(emp) {
  return {
    id: emp.emp_id,
    employee_id: emp.emp_id,
    name: formatEmployeeName(emp),
    department: emp.position || '',
  };
}

function parseEmployeeForm(form) {
  const parts = (form.name || '').split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      emp_id: form.employee_id,
      surname: parts[0],
      first_name: parts[1],
      position: form.department || null,
    };
  }
  return {
    emp_id: form.employee_id,
    first_name: form.name,
    surname: form.name || '—',
    position: form.department || null,
  };
}

const TYPE_TO_SERVER = {
  'TIME IN': 'IN',
  'TIME OUT': 'OUT',
  'LUNCH OUT': 'LUNCH-OUT',
  'LUNCH IN': 'LUNCH-IN',
};

const TYPE_FROM_SERVER = {
  IN: 'TIME IN',
  'LUNCH-OUT': 'LUNCH OUT',
  'LUNCH-IN': 'LUNCH IN',
  OUT: 'TIME OUT',
  'OT-IN': 'OVERTIME',
  'OT-OUT': 'OVERTIME',
  ABSENT: 'ABSENT',
};

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

function toPageRecord(r) {
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

export const api = {
  employees: {
    async list(search = '') {
      const params = search ? { search } : {};
      const res = await request(http.get('/employees', { params }));
      return res.data.map(toPageEmployee);
    },
    async create(form) {
      await request(http.post('/employees', parseEmployeeForm(form)));
    },
    async update(id, form) {
      await request(http.put(`/employees/${id}`, parseEmployeeForm(form)));
    },
    async remove(id) {
      await request(http.delete(`/employees/${id}`));
    },
  },
  records: {
    async list(filters = {}) {
      const params = {};
      if (filters.search) params.emp_id = filters.search;
      if (filters.date) params.date = filters.date;
      if (filters.type && filters.type !== 'ALL' && TYPE_TO_SERVER[filters.type]) {
        params.type = TYPE_TO_SERVER[filters.type];
      }

      const res = await request(http.get('/records', { params }));
      let rows = res.data.map(toPageRecord);

      if (filters.type === 'OVERTIME') {
        rows = rows.filter((r) => r.record_type === 'OVERTIME');
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.employee_id?.toLowerCase().includes(q) ||
            r.name?.toLowerCase().includes(q),
        );
      }

      return { records: rows, total: rows.length };
    },
    async remove(id) {
      await request(http.delete(`/records/${id}`));
    },
    async clearAll() {
      const { records } = await api.records.list({});
      await Promise.all(records.map((r) => api.records.remove(r.id)));
    },
    async clearAbsent() {
      const { records } = await api.records.list({});
      const absent = records.filter(r => r.type === 'ABSENT');
      await Promise.all(absent.map((r) => api.records.remove(r.id)));
      return absent.length;
    },
    async download(kind, filters) {
      if (kind === 'raw') {
        const { records } = await api.records.list(filters);
        const text = records
          .map((r) =>
            [r.employee_id, r.name, r.date, r.time, r.record_type, r.day].join('\t'),
          )
          .join('\n');
        return new Response(text, { headers: { 'Content-Type': 'text/plain' } });
      }

      const params = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.date) params.date = filters.date;
      if (filters?.type && filters.type !== 'ALL') params.type = filters.type;
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;

      const res = await request(
        http.get(`/records/export/${kind}`, { params, responseType: 'blob' }),
      );
      return res.data;
    },
  },
};
