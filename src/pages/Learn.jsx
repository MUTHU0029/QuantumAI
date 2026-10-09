import { useEffect, useState } from 'react';
import LessonCard from '../components/LessonCard';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

function Learn() {
  const { token, logout } = useAuth();
  const [state, setState] = useState({ loading: true, lessons: [], error: '' });

  useEffect(() => {
    let active = true;
    authService.studentLessons(token)
      .then(({ lessons }) => {
        if (active) setState({ loading: false, lessons, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          logout();
          return;
        }
        setState({ loading: false, lessons: [], error: error.message });
      });
    return () => {
      active = false;
    };
  }, [token, logout]);

  if (state.loading) {
    return <p role="status" className="panel p-5 text-sm text-slate-600">Loading published lessons…</p>;
  }
  if (state.error) {
    return <p role="alert" className="panel p-5 text-sm text-rose-700">{state.error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Course catalogue</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Learn quantum fundamentals</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{state.lessons.length} published lessons</span>
      </div>

      {state.lessons.length === 0 ? (
        <div className="panel p-6 text-sm text-slate-600">No lessons have been published yet.</div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {state.lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Learn;
