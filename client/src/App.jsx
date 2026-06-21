import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeaveProvider } from './context/LeaveContext';
import Layout from './components/Layout';
import ScannerPage from './pages/ScannerPage';
import RecordsPage from './pages/RecordsPage';
import EmployeesPage from './pages/EmployeesPage';
import BarcodesPage from './pages/BarcodesPage';
import LeavePage from './pages/LeavePage';
import LeaveEvaluationPage from './pages/LeaveEvaluationPage';
import { useEffect } from 'react';

function AdminRoute({ children }) {
  const { admin, loading, openLogin } = useAuth();

  useEffect(() => {
    if (!loading && !admin) openLogin();
  }, [loading, admin, openLogin]);

  if (!admin) return <Navigate to="/scanner" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <LeaveProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/scanner" replace />} />
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="leave"   element={<LeavePage />} />
              <Route path="records"          element={<AdminRoute><RecordsPage /></AdminRoute>} />
              <Route path="employees"        element={<AdminRoute><EmployeesPage /></AdminRoute>} />
              <Route path="barcodes"         element={<AdminRoute><BarcodesPage /></AdminRoute>} />
              <Route path="leave-evaluation" element={<AdminRoute><LeaveEvaluationPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/scanner" replace />} />
          </Routes>
        </LeaveProvider>
      </AuthProvider>
    </HashRouter>
  );
}
