// Run with: npm run seed
const bcrypt          = require('bcryptjs');
const { getDb, runMigrations } = require('./database');

runMigrations();
const db = getDb();

// ── Employees ──────────────────────────────────────────────
const employees = [
  {
    emp_id: 'JRLF-WM-01-05-26', first_name: 'JAF ROLAND', middle_name: 'LARON',
    surname: 'FAJARDO', initials: 'JRLF', dob: '1984-12-17', age: 41,
    gender: 'MALE', civil_status: 'MARRIED', blood_type: 'B+',
    present_address: 'SAN ANDRESS GUIMBA NUEVA ECIJA',
    permanent_address: 'PUROK-6 RANIAG RAMON ISABELA',
    mobile: '9186768858', email: 'jafrolandfajardo17@gmail.com',
    corp_email: 'jaf@magallonesgroup.com', hired_date: '2026-05-01',
    share: 'A', position: 'WAREHOUSE MANAGER', title_initials: 'WM', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'CAR-AWM-06-05-26', first_name: 'CHRISTOPHER', middle_name: 'AQUINO',
    surname: 'RODRIGUEZ', initials: 'CAR', dob: '1983-11-29', age: 42,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: 'O+',
    present_address: 'SAN ANDRESS GUIMBA NUEVA ECIJA',
    permanent_address: 'BAGUIO CITY BENGUET',
    mobile: '9562779506', email: 'sydkai29@gmail.com',
    corp_email: 'christopherrodriguez@magallonesgroup.com', hired_date: '2026-05-06',
    share: 'A', position: 'ASSISTANT WAREHOUSE MANAGER', title_initials: 'AWM', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'JSC-WS-08-06-21', first_name: 'JEFFREY', middle_name: 'SAPON',
    surname: 'CONCEPCION', initials: 'JSC', dob: '1984-08-09', age: 41,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: 'O+',
    present_address: 'PUROK-4 RIZAL SANTIAGO CITY ISABELA',
    permanent_address: 'PUROK-4 RIZAL SANTIAGO CITY ISABELA',
    mobile: '9050434002', email: 'jeffreyconcepcion08091984@gmail.com',
    corp_email: 'jeffreyconception@magallonesgroup.com', hired_date: '2021-06-08',
    share: 'B', position: 'WAREHOUSE SUPERVISOR', title_initials: 'WS', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'RAIF-RDU-02-02-24', first_name: 'REXY AMOR', middle_name: 'ISIDRO',
    surname: 'FACUN', initials: 'RAIF', dob: '1995-09-15', age: 30,
    gender: 'MALE', civil_status: 'MARRIED', blood_type: 'O+',
    present_address: 'CAVITE GUIMBA NUEVA ECIJA',
    permanent_address: 'CAVITE GUIMBA NUEVA ECIJA',
    mobile: '9485101439', email: 'rexyamorfacun152914@gmail.com',
    corp_email: null, hired_date: '2024-02-02',
    share: 'B', position: 'RECEIVING DISPATCHING UNIT', title_initials: 'RDU', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'RCF-RDU-/09/2019', first_name: 'RENMAR', middle_name: 'CAMACHO',
    surname: 'FRONDA', initials: 'RCF', dob: '1998-11-29', age: 27,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: null,
    present_address: 'AGUINALDO CORDON ISABELA',
    permanent_address: 'AGUINALDO CORDON ISABELA',
    mobile: '9676328456', email: null,
    corp_email: null, hired_date: '/09/2019',
    share: 'B', position: 'RECEIVING DISPATCHING UNIT', title_initials: 'RDU', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'ILL-PPI-28-08-22', first_name: 'IREN', middle_name: 'LATORRE',
    surname: 'LUCQUIAO', initials: 'ILL', dob: '1990-11-28', age: 36,
    gender: 'FEMALE', civil_status: 'SINGLE', blood_type: 'O',
    present_address: 'PUROK MANGA MANACSAC GUIMBA NUEVA ECIJA',
    permanent_address: 'PUROK MANGA MANACSAC GUIMBA NUEVA ECIJA',
    mobile: '9947324287', email: null,
    corp_email: null, hired_date: '2022-08-28',
    share: 'B', position: 'PICK PACK INVENTORY', title_initials: 'PPI', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'AEP-RDU-04-01-22', first_name: 'ARIEL', middle_name: 'ESTOESTA',
    surname: 'PACARIEM', initials: 'AEP', dob: '1998-07-24', age: 27,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: null,
    present_address: 'CARANOGAN SAN MANUEL ISABELA',
    permanent_address: 'CARANOGAN SAN MANUEL ISABELA',
    mobile: '9493688285', email: null,
    corp_email: null, hired_date: '2022-01-04',
    share: 'B', position: 'RECEIVING DISPATCHING UNIT', title_initials: 'RDU', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'TDCT-DM-28-08-22', first_name: 'TIRSO', middle_name: 'DELA CRUZ',
    surname: 'TIGOLO', initials: 'TDCT', dob: '1979-03-20', age: 47,
    gender: 'MALE', civil_status: 'MARRIED', blood_type: 'AB+',
    present_address: 'PUROK MANGA MANACSAC GUIMBA NUEVA ECIJA',
    permanent_address: 'PUROK MANGA MANACSAC GUIMBA NUEVA ECIJA',
    mobile: '9935783233', email: null,
    corp_email: null, hired_date: '2022-08-28',
    share: 'B', position: 'DRIVER MECHANIC', title_initials: 'DM', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'JAN-CSR-03-01-22', first_name: 'JERRY', middle_name: 'AGUILAR',
    surname: 'NERI', initials: 'JAN', dob: '1998-03-19', age: 28,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: 'O+',
    present_address: 'SAN ROQUE WEST GUIMBA NUEVA ECIJA',
    permanent_address: 'SAN ROQUE WEST GUIMBA NUEVA ECIJA',
    mobile: '9303341733', email: 'nerijerry3@gmail.com',
    corp_email: null, hired_date: '2022-01-03',
    share: 'B', position: 'CUSTOMER SALES REPRESENTATIVE', title_initials: 'CSR', emp_status: 'ACTIVE'
  },
  {
    emp_id: 'RMM-MIS-25-04-25', first_name: 'RAPRAP', middle_name: 'MACABALE',
    surname: 'MACAPULAY', initials: 'RMM', dob: '1999-05-31', age: 26,
    gender: 'MALE', civil_status: 'SINGLE', blood_type: null,
    present_address: 'SAN ROQUE WEST GUIMBA NUEVA ECIJA',
    permanent_address: 'SAN ROQUE WEST GUIMBA NUEVA ECIJA',
    mobile: '9774881500', email: 'rapmacapulay31@gmail.com',
    corp_email: 'raprapmacapulay@magallonesgroup.com', hired_date: '2025-04-25',
    share: 'B', position: 'MANAGEMENT INFORMATION SYSTEM', title_initials: 'MIS', emp_status: 'ACTIVE'
  }
];

const insertEmp = db.prepare(`
  INSERT OR IGNORE INTO employees (
    emp_id, first_name, middle_name, surname, initials,
    dob, age, gender, civil_status, blood_type,
    present_address, permanent_address, mobile, email, corp_email,
    hired_date, share, position, title_initials, emp_status
  ) VALUES (
    @emp_id, @first_name, @middle_name, @surname, @initials,
    @dob, @age, @gender, @civil_status, @blood_type,
    @present_address, @permanent_address, @mobile, @email, @corp_email,
    @hired_date, @share, @position, @title_initials, @emp_status
  )
`);

const seedEmployees = db.transaction(() => {
  let count = 0;
  for (const emp of employees) {
    const result = insertEmp.run(emp);
    if (result.changes) count++;
  }
  return count;
});

const empCount = seedEmployees();
console.log(`✓ Employees seeded: ${empCount} inserted (skipped duplicates)`);

// ── Default superadmin ─────────────────────────────────────
// Change this password before deploying to production!
const DEFAULT_PASSWORD = 'naba6819';
const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO admins (email, password_hash, name, role)
  VALUES (?, ?, ?, ?)
`);

const adminResult = insertAdmin.run(
  'christopherrodriguez@magallonesgroup.com',
  hash,
  'System Admin',
  'superadmin'
);

if (adminResult.changes) {
  console.log('✓ Default admin created:');
  console.log('  Email:    christopherrodriguez@magallonesgroup.com');
  console.log('  Password: naba6819  ← CHANGE THIS BEFORE GOING LIVE');
} else {
  console.log('· Admin already exists, skipped.');
}

console.log('\n✓ Seed complete.');
