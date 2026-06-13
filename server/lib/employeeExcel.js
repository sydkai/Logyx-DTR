const XLSX = require('xlsx');

const EXPORT_COLUMNS = [
  'Employee #',
  'First Name',
  'Middle Name',
  'Surname',
  'Initials',
  'Date of Birth',
  'Age',
  'Gender',
  'Civil Status',
  'Blood Type',
  'Present Address',
  'Permanent Address',
  'Mobile No.',
  'Email',
  'Corporate Email',
  'Hired Date',
  'Share',
  'Title / Position',
  'Title Initials',
  'Employment Status',
];

function toStr(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function toAge(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.trim().toLowerCase()] = value;
  }
  return out;
}

function pick(row, ...aliases) {
  const norm = normalizeRow(row);
  for (const alias of aliases) {
    const val = norm[alias.toLowerCase()];
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
  }
  return null;
}

function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }

  return s;
}

function rowToEmployee(row) {
  const emp_id = toStr(pick(row, 'Employee #', 'Employee#', 'Employee ID', 'Emp ID', 'emp_id'));
  const first_name = toStr(pick(row, 'First Name', 'FirstName', 'first_name'));
  const surname = toStr(pick(row, 'Surname', 'Last Name', 'LastName', 'surname'));

  if (!emp_id || !first_name || !surname) return null;

  return {
    emp_id,
    first_name,
    middle_name: toStr(pick(row, 'Middle Name', 'MiddleName', 'middle_name')),
    surname,
    initials: toStr(pick(row, 'Initials', 'initials')),
    dob: parseDate(pick(row, 'Date of Birth', 'DOB', 'dob')),
    age: toAge(pick(row, 'Age', 'age')),
    gender: toStr(pick(row, 'Gender', 'gender')),
    civil_status: toStr(pick(row, 'Civil Status', 'civil_status')),
    blood_type: toStr(pick(row, 'Blood Type', 'blood_type')),
    present_address: toStr(pick(row, 'Present Address', 'present_address')),
    permanent_address: toStr(pick(row, 'Permanent Address', 'permanent_address')),
    mobile: toStr(pick(row, 'Mobile No.', 'Mobile', 'Mobile No', 'mobile')),
    email: toStr(pick(row, 'Email', 'email')),
    corp_email: toStr(pick(row, 'Corporate Email', 'Corp Email', 'corp_email')),
    hired_date: toStr(parseDate(pick(row, 'Hired Date', 'hired_date')) || pick(row, 'Hired Date', 'hired_date')),
    share: toStr(pick(row, 'Share', 'share')),
    position: toStr(pick(row, 'Title / Position', 'Position', 'Title', 'position')),
    title_initials: toStr(pick(row, 'Title Initials', 'title_initials')),
    emp_status: (toStr(pick(row, 'Employment Status', 'Status', 'emp_status')) || 'ACTIVE').toUpperCase(),
  };
}

function employeeToRow(emp) {
  return {
    'Employee #': emp.emp_id,
    'First Name': emp.first_name,
    'Middle Name': emp.middle_name || '',
    Surname: emp.surname,
    Initials: emp.initials || '',
    'Date of Birth': emp.dob || '',
    Age: emp.age ?? '',
    Gender: emp.gender || '',
    'Civil Status': emp.civil_status || '',
    'Blood Type': emp.blood_type || '',
    'Present Address': emp.present_address || '',
    'Permanent Address': emp.permanent_address || '',
    'Mobile No.': emp.mobile || '',
    Email: emp.email || '',
    'Corporate Email': emp.corp_email || '',
    'Hired Date': emp.hired_date || '',
    Share: emp.share || '',
    'Title / Position': emp.position || '',
    'Title Initials': emp.title_initials || '',
    'Employment Status': emp.emp_status || 'ACTIVE',
  };
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const employees = [];
  const skipped = [];

  rows.forEach((row, index) => {
    const emp = rowToEmployee(row);
    if (emp) employees.push(emp);
    else if (Object.values(row).some((v) => String(v).trim() !== '')) {
      skipped.push({ row: index + 2, reason: 'Missing Employee #, First Name, or Surname' });
    }
  });

  return { employees, skipped };
}

function buildWorkbook(employees) {
  const rows = employees.map(employeeToRow);
  const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Roster');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  EXPORT_COLUMNS,
  rowToEmployee,
  employeeToRow,
  parseWorkbook,
  buildWorkbook,
};
