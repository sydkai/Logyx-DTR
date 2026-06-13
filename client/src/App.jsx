import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeaveProvider } from './context/LeaveContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';
import RecordsPage from './pages/RecordsPage';
import EmployeesPage from './pages/EmployeesPage';
import BarcodesPage from './pages/BarcodesPage';
import LeavePage from './pages/LeavePage';
import LeaveEvaluationPage from './pages/LeaveEvaluationPage';

function AdminRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div style={{ color: 'var(--accent)', padding: '40px', textAlign: 'center' }}>Loading…</div>;
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    // 1. BrowserRouter must be the outermost wrapper so ALL providers and
    //    components below it can safely use router hooks (useNavigate, etc.)
    <BrowserRouter>
      {/* 2. AuthProvider is inside BrowserRouter — safe to use router hooks internally */}
      <AuthProvider>
        {/* 3. LeaveProvider shares leave state across LeavePage ↔ LeaveEvaluationPage */}
        <LeaveProvider>
          <Routes>
            {/* Login — no layout */}
            <Route path="/login" element={<LoginPage />} />

            {/* All pages share Layout (sidebar) */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/scanner" replace />} />

              {/* ✅ Public — always accessible */}
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="leave"   element={<LeavePage />} />

              {/* 🔒 Admin-only */}
              <Route path="records"          element={<AdminRoute><RecordsPage /></AdminRoute>} />
              <Route path="employees"        element={<AdminRoute><EmployeesPage /></AdminRoute>} />
              <Route path="barcodes"         element={<AdminRoute><BarcodesPage /></AdminRoute>} />
              <Route path="leave-evaluation" element={<AdminRoute><LeaveEvaluationPage /></AdminRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/scanner" replace />} />
          </Routes>
        </LeaveProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
