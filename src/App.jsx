import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { HomeRedirect, ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Learn from './pages/Learn';
import LessonDetail from './pages/LessonDetail';
import CircuitLab from './pages/CircuitLab';
import AITutor from './pages/AITutor';
import Progress from './pages/Progress';
import StudentDashboard from './pages/StudentDashboard';

const routeTitles = {
  '/admin': 'Admin dashboard',
  '/dashboard': 'Dashboard',
  '/learn': 'Learn',
  '/circuit-lab': 'Quantum Circuit Lab',
  '/ai-tutor': 'AI Tutor',
  '/progress': 'My Progress',
};

function AuthenticatedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentTitle = useMemo(() => {
    const title = routeTitles[location.pathname] || 'QuantumLearn AI';
    return title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          role={user.role}
        />

        <div className="flex-1">
          <Header
            title={currentTitle}
            onMenuClick={() => setSidebarOpen(true)}
            user={user}
            onLogout={logout}
          />

          <main className="px-4 py-5 md:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route element={<ProtectedRoute requiredRole="student" />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:lessonId" element={<LessonDetail />} />
            <Route path="/circuit-lab" element={<CircuitLab />} />
            <Route path="/ai-tutor" element={<AITutor />} />
            <Route path="/progress" element={<Progress />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
