import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import LessonDetail from './pages/LessonDetail';
import CircuitLab from './pages/CircuitLab';
import AITutor from './pages/AITutor';
import Progress from './pages/Progress';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/learn': 'Learn',
  '/circuit-lab': 'Quantum Circuit Lab',
  '/ai-tutor': 'AI Tutor',
  '/progress': 'My Progress',
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = useMemo(() => {
    const title = routeTitles[location.pathname] || 'QuantumLearn AI';
    return title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1">
          <Header
            title={currentTitle}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <main className="px-4 py-5 md:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:lessonId" element={<LessonDetail />} />
              <Route path="/circuit-lab" element={<CircuitLab />} />
              <Route path="/ai-tutor" element={<AITutor />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
