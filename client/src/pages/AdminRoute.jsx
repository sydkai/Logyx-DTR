import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return null; // wait for token check
  return admin ? children : <Navigate to="/login" replace />;
}