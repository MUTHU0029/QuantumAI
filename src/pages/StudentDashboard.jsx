import { useEffect, useState } from 'react';
import Dashboard from './Dashboard';
import { useAuth } from '../context/AuthContext';
import { authService, ApiError } from '../services/authService';

function StudentDashboard() {
  const { token, logout } = useAuth();
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;
    authService.studentDashboard(token)
      .then(() => {
        if (active) setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        setStatus({ loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [token, logout]);

  if (status.loading && !status.error) {
    return <p role="status" className="panel p-5 text-sm text-slate-600">Loading your student dashboard…</p>;
  }
  if (status.error) {
    return <p role="alert" className="panel p-5 text-sm text-rose-700">{status.error}</p>;
  }
  return <Dashboard />;
}

export default StudentDashboard;
