import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleHelp,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';

const TOPICS = [
  'Qubits',
  'Quantum Gates',
  'Superposition',
  'Entanglement',
  'Quantum Algorithms',
];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const NAV = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'exercises', label: 'Exercises & quizzes', icon: CircleHelp },
  { id: 'analytics', label: 'Learning analytics', icon: Activity },
  { id: 'monitoring', label: 'Circuits & AI tutor', icon: BrainCircuit },
];

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function dateFilters(from, to) {
  return { from: new Date(`${from}T00:00:00Z`).toISOString(), to: new Date(`${to}T23:59:59Z`).toISOString() };
}

function Panel({ title, action, children }) {
  return (
    <section className="panel min-w-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint, icon: Icon, tint }) {
  return (
    <section className="panel flex items-start justify-between gap-3 p-5">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '—'}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
      <span className={`rounded-xl p-3 ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
    </section>
  );
}

function Message({ error, success }) {
  if (error) return <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;
  if (success) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>;
  return null;
}

function Field({ label, value, onChange, required = true, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      />
    </label>
  );
}

function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const [section, setSection] = useState('overview');
  const [state, setState] = useState({
    loading: true,
    error: '',
    success: '',
    dashboard: null,
    students: [],
    studentTotal: 0,
    lessons: [],
    exercises: [],
    analytics: null,
    circuits: null,
    tutor: null,
  });
  const [studentQuery, setStudentQuery] = useState('');
  const [studentStatus, setStudentStatus] = useState('all');
  const [studentOffset, setStudentOffset] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [dateFrom, setDateFrom] = useState(localDate(29));
  const [dateTo, setDateTo] = useState(localDate());
  const [analyticsStudent, setAnalyticsStudent] = useState('');
  const [activityFilters, setActivityFilters] = useState(dateFilters(localDate(29), localDate()));

  const setError = useCallback((error) => {
    if (error.status === 401 || error.status === 403) logout();
    setState((current) => ({ ...current, error: error.message || 'The request failed.', success: '' }));
  }, [logout]);

  const loadCore = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [dashboard, lessons, exercises] = await Promise.all([
        adminService.dashboard(token),
        adminService.lessons(token),
        adminService.exercises(token),
      ]);
      setState((current) => ({
        ...current,
        loading: false,
        error: '',
        dashboard,
        lessons: lessons.lessons,
        exercises: exercises.exercises,
      }));
    } catch (error) {
      setError(error);
      setState((current) => ({ ...current, loading: false }));
    }
  }, [token, setError]);

  const loadStudents = useCallback(async () => {
    try {
      const result = await adminService.students(token, {
        limit: '100',
        offset: String(studentOffset),
        search: studentQuery,
        status: studentStatus,
      });
      setState((current) => ({
        ...current,
        students: result.students,
        studentTotal: result.total,
        error: '',
      }));
    } catch (error) {
      setError(error);
    }
  }, [setError, studentOffset, studentQuery, studentStatus, token]);

  const loadAnalytics = useCallback(async () => {
    const filters = dateFilters(dateFrom, dateTo);
    if (analyticsStudent) filters.student_id = analyticsStudent;
    setActivityFilters(dateFilters(dateFrom, dateTo));
    try {
      const analytics = await adminService.analytics(token, filters);
      setState((current) => ({ ...current, analytics, error: '' }));
    } catch (error) {
      setError(error);
    }
  }, [analyticsStudent, dateFrom, dateTo, setError, token]);

  const loadMonitoring = useCallback(async () => {
    const filters = activityFilters;
    try {
      const [circuits, tutor] = await Promise.all([
        adminService.circuits(token, filters),
        adminService.tutor(token, filters),
      ]);
      setState((current) => ({ ...current, circuits, tutor, error: '' }));
    } catch (error) {
      setError(error);
    }
  }, [activityFilters, setError, token]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  const refresh = async (success = '') => {
    await Promise.all([loadCore(), loadStudents()]);
    if (success) setState((current) => ({ ...current, success }));
  };

  const studentDetail = async (studentId) => {
    try {
      setSelectedStudent(await adminService.student(token, studentId));
    } catch (error) {
      setError(error);
    }
  };

  const changeStudentStatus = async (student) => {
    const status = student.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${status === 'inactive' ? 'Deactivate' : 'Activate'} ${student.name}'s account?`)) return;
    try {
      await adminService.setStudentStatus(token, student.id, status);
      await refresh(`Student account ${status}.`);
    } catch (error) {
      setError(error);
    }
  };

  const removeStudent = async (student) => {
    if (!window.confirm(`Permanently delete ${student.name} and their activity history? This cannot be undone.`)) return;
    const confirmation = window.prompt(`Type ${student.email} to confirm permanent deletion.`);
    if (confirmation === null) return;
    try {
      await adminService.deleteStudent(token, student.id, confirmation);
      setSelectedStudent(null);
      await refresh('Student account and linked activity permanently deleted.');
    } catch (error) {
      setError(error);
    }
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const lesson = {
      title: data.get('title'),
      description: data.get('description'),
      topic: data.get('topic'),
      difficulty: data.get('difficulty'),
      content: data.get('content'),
      examples: String(data.get('examples') || '').split('\n').map((item) => item.trim()).filter(Boolean),
      published: data.get('published') === 'on',
    };
    try {
      if (editingLesson?.id) {
        await adminService.updateLesson(token, editingLesson.id, lesson);
        setEditingLesson(null);
        await refresh('Lesson updated.');
      } else {
        await adminService.createLesson(token, lesson);
        form.reset();
        await refresh('Lesson created.');
      }
    } catch (error) {
      setError(error);
    }
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Delete "${lesson.title}" and its linked exercises and recorded activity?`)) return;
    try {
      await adminService.deleteLesson(token, lesson.id);
      await refresh('Lesson and linked records deleted.');
    } catch (error) {
      setError(error);
    }
  };

  const saveExercise = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const exercise = {
      lesson_id: form.get('lesson_id'),
      question: form.get('question'),
      options: [0, 1, 2, 3].map((index) => form.get(`option-${index}`)).filter((option) => option !== ''),
      correct_index: Number(form.get('correct_index')),
      explanation: form.get('explanation'),
      difficulty: form.get('difficulty'),
      published: form.get('published') === 'on',
    };
    try {
      if (editingExercise?.id) {
        await adminService.updateExercise(token, editingExercise.id, exercise);
        setEditingExercise(null);
        await refresh('Exercise updated.');
      } else {
        await adminService.createExercise(token, exercise);
        formElement.reset();
        await refresh('Exercise created.');
      }
    } catch (error) {
      setError(error);
    }
  };

  const deleteExercise = async (exercise) => {
    if (!window.confirm('Delete this exercise? Existing submitted scores will remain in activity history.')) return;
    try {
      await adminService.deleteExercise(token, exercise.id);
      await refresh('Exercise deleted.');
    } catch (error) {
      setError(error);
    }
  };

  const togglePublished = async (lesson) => {
    try {
      await adminService.updateLesson(token, lesson.id, {
        title: lesson.title,
        description: lesson.description,
        topic: lesson.topic || TOPICS[0],
        difficulty: lesson.difficulty,
        content: lesson.content || lesson.explanation || '',
        examples: lesson.examples || [],
        published: !lesson.published,
      });
      await refresh(`Lesson ${lesson.published ? 'unpublished' : 'published'}.`);
    } catch (error) {
      setError(error);
    }
  };

  const toggleExercise = async (exercise) => {
    try {
      await adminService.updateExercise(token, exercise.id, {
        ...exercise,
        published: !exercise.published,
      });
      await refresh(`Exercise ${exercise.published ? 'unpublished' : 'published'}.`);
    } catch (error) {
      setError(error);
    }
  };

  const resolveReport = async (report) => {
    const verified = window.prompt('Enter the verified educational explanation (up to 3000 characters):');
    if (verified === null) return;
    try {
      await adminService.reviewTutorReport(token, report.id, 'resolved', verified);
      await loadMonitoring();
      setState((current) => ({ ...current, success: 'Tutor report resolved with verified explanation.' }));
    } catch (error) {
      setError(error);
    }
  };

  if (state.loading && !state.dashboard) {
    return <p role="status" className="panel p-6 text-sm text-slate-600">Loading live admin data…</p>;
  }

  const stats = state.dashboard?.stats || {};
  const registrationChart = state.dashboard?.registration_stats || [];
  const activityChart = state.dashboard?.activity_stats || [];

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 p-6 text-white shadow-xl shadow-slate-900/10 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">QuantumLearn AI · Administration</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Admin dashboard</h1>
            <p className="mt-2 text-sm text-slate-200">Welcome, {user.name}. Live platform and learning data.</p>
          </div>
          <button type="button" className="secondary-button border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh data
          </button>
        </div>
      </header>

      <Message error={state.error} success={state.success} />

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Admin sections">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${section === id ? 'bg-cyan-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setSection(id)}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </nav>

      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Registered students" value={stats.total_students} hint="All student accounts" icon={Users} tint="bg-cyan-50 text-cyan-700" />
            <Stat label="Active students" value={stats.active_students} hint="Active in the last 30 days" icon={Activity} tint="bg-emerald-50 text-emerald-700" />
            <Stat label="Lessons" value={stats.total_lessons} hint={`${state.lessons.filter((item) => item.published).length} published`} icon={BookOpen} tint="bg-blue-50 text-blue-700" />
            <Stat label="Exercises" value={stats.total_exercises} hint="Total quizzes and exercises" icon={CircleHelp} tint="bg-violet-50 text-violet-700" />
            <Stat label="Circuit previews" value={stats.total_simulations} hint="Recorded student simulations" icon={BrainCircuit} tint="bg-amber-50 text-amber-700" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Student registrations · last 30 days">
              {registrationChart.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={registrationChart}>
                      <defs><linearGradient id="registrations" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#0891b2" stopOpacity={0.65} /><stop offset="95%" stopColor="#0891b2" stopOpacity={0.05} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#0891b2" fill="url(#registrations)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No registrations in this period.</p>}
            </Panel>
            <Panel title="Learning activity · last 30 days">
              {activityChart.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0891b2" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No learning activity recorded in this period.</p>}
            </Panel>
          </div>
          <Panel title="Recent student activity">
            {state.dashboard?.recent_activities?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Activity</th><th>Student ID</th><th>Details</th><th>Date</th></tr></thead>
                  <tbody>{state.dashboard.recent_activities.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-3 capitalize">{item.type.replaceAll('_', ' ')}</td>
                      <td>{item.student_name || `${item.student_id.slice(0, 12)}…`}{item.student_email && <span className="block text-xs text-slate-500">{item.student_email}</span>}</td>
                      <td>{item.lesson_id || item.topic || item.exercise_id || (item.success === false ? 'Error' : '')}</td>
                      <td>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-500">No student activity has been recorded yet.</p>}
          </Panel>
          <Panel title="Administrator profile">
            <p className="text-sm text-slate-700"><strong>{user.name}</strong> · {user.email} · Administrator</p>
            <p className="mt-1 text-xs text-slate-500">Account ID: {user.id}. Sign out using the button in the top navigation.</p>
          </Panel>
        </div>
      )}

      {section === 'students' && (
        <div className="space-y-6">
          <Panel title={`Student management · ${state.studentTotal} registered`}>
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr,200px]">
              <input className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Search name or email…" value={studentQuery} onChange={(event) => { setStudentQuery(event.target.value); setStudentOffset(0); }} />
              <select className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" value={studentStatus} onChange={(event) => { setStudentStatus(event.target.value); setStudentOffset(0); }}>
                <option value="all">All accounts</option><option value="active">Active accounts</option><option value="inactive">Deactivated accounts</option>
              </select>
            </div>
            {state.students.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Student</th><th>Registered</th><th>Last active</th><th>Completed lessons</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{state.students.map((student) => (
                    <tr key={student.id} className="border-t border-slate-100">
                      <td className="py-3"><button className="text-left font-semibold text-cyan-800 hover:underline" onClick={() => studentDetail(student.id)}>{student.name}</button><span className="block text-xs text-slate-500">{student.email}</span></td>
                      <td>{student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'}</td>
                      <td>{student.last_active_at ? new Date(student.last_active_at).toLocaleDateString() : 'Not active yet'}</td>
                      <td>{student.completed_lessons}</td>
                      <td><span className={`rounded-full px-2 py-1 text-xs ${student.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{student.status}</span></td>
                      <td><div className="flex gap-2"><button className="text-xs font-semibold text-cyan-800 hover:underline" onClick={() => changeStudentStatus(student)}>{student.status === 'active' ? 'Deactivate' : 'Activate'}</button><button className="text-xs font-semibold text-rose-700 hover:underline" onClick={() => removeStudent(student)}>Delete</button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No students match these filters.</p>}
            {state.studentTotal > 100 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">Showing {studentOffset + 1}–{Math.min(studentOffset + 100, state.studentTotal)} of {state.studentTotal}</span>
                <div className="flex gap-2">
                  <button className="secondary-button px-3 py-2" disabled={studentOffset === 0} onClick={() => setStudentOffset((offset) => Math.max(0, offset - 100))}>Previous</button>
                  <button className="secondary-button px-3 py-2" disabled={studentOffset + 100 >= state.studentTotal} onClick={() => setStudentOffset((offset) => offset + 100)}>Next</button>
                </div>
              </div>
            )}
          </Panel>
          {selectedStudent && (
            <Panel title={`Student details · ${selectedStudent.student.name}`} action={<button className="text-sm text-cyan-800 hover:underline" onClick={() => setSelectedStudent(null)}>Close</button>}>
              <p className="text-sm text-slate-600">{selectedStudent.student.email} · Account {selectedStudent.student.status} · Registered {selectedStudent.student.created_at ? new Date(selectedStudent.student.created_at).toLocaleDateString() : '—'}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Completed lessons</p><p className="mt-1 text-2xl font-bold">{selectedStudent.progress.completed_lessons.length}</p><ul className="mt-2 space-y-1 text-xs">{selectedStudent.progress.completed_lessons.map((item) => <li key={`${item.lesson_id}-${item.completed_at}`}>{item.title}</li>)}</ul></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Circuit preview activity</p><p className="mt-1 text-2xl font-bold">{selectedStudent.progress.circuit_simulations}</p><p className="mt-2 text-xs">H {selectedStudent.progress.gates_used.H} · X {selectedStudent.progress.gates_used.X} · CNOT {selectedStudent.progress.gates_used.CNOT}</p><p className="mt-2 text-xs text-slate-500">No circuit sequences or private circuit data are available here.</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Exercise submissions</p><ul className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">{selectedStudent.progress.exercise_scores.map((item, index) => <li key={`${item.exercise_id}-${item.submitted_at}-${index}`}>{item.exercise_id}: {item.score}/{item.total} ({item.accuracy}%)</li>)}</ul>{!selectedStudent.progress.exercise_scores.length && <p className="mt-2 text-xs text-slate-500">No exercise scores recorded.</p>}</div>
              </div>
            </Panel>
          )}
        </div>
      )}

      {section === 'lessons' && (
        <div className="space-y-6">
          <Panel title={editingLesson ? `Edit lesson · ${editingLesson.title}` : 'Create a lesson'}>
            <form key={editingLesson?.id || 'new'} className="grid gap-4 md:grid-cols-2" onSubmit={saveLesson}>
              <Field label="Title" name="title" defaultValue={editingLesson?.title || ''} maxLength={100} />
              <label className="block text-sm font-medium text-slate-700">Topic<select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" name="topic" defaultValue={editingLesson?.topic || TOPICS[0]}>{TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
              <label className="block text-sm font-medium text-slate-700">Difficulty<select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" name="difficulty" defaultValue={editingLesson?.difficulty || DIFFICULTIES[0]}>{DIFFICULTIES.map((level) => <option key={level}>{level}</option>)}</select></label>
              <Field label="Description" name="description" defaultValue={editingLesson?.description || ''} maxLength={1000} />
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Learning content<textarea className="mt-1 min-h-36 w-full rounded-xl border border-slate-300 px-3 py-2.5" name="content" defaultValue={editingLesson?.content || editingLesson?.explanation || ''} maxLength={12000} required /></label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">Examples (one per line)<textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" name="examples" defaultValue={(editingLesson?.examples || []).join('\n')} /></label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="published" defaultChecked={editingLesson?.published || false} /> Publish immediately</label>
              <div className="flex flex-wrap gap-2 md:justify-end"><button className="primary-button" type="submit">{editingLesson ? 'Save changes' : 'Create lesson'}</button>{editingLesson && <button className="secondary-button" type="button" onClick={() => setEditingLesson(null)}>Cancel edit</button>}</div>
            </form>
          </Panel>
          <Panel title={`Lessons · ${state.lessons.length}`}>
            {state.lessons.length ? <div className="grid gap-4 xl:grid-cols-2">{state.lessons.map((lesson) => (
              <article key={lesson.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{lesson.title}</h3><p className="mt-1 text-xs text-slate-500">{lesson.topic} · {lesson.difficulty}</p></div><span className={`rounded-full px-2 py-1 text-xs ${lesson.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{lesson.published ? 'Published' : 'Draft'}</span></div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{lesson.description}</p>
                <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-cyan-800">Preview lesson</summary><div className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{lesson.content || lesson.explanation}<ul className="mt-2 list-inside list-disc">{(lesson.examples || []).map((example) => <li key={example}>{example}</li>)}</ul></div></details>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold"><button className="text-cyan-800 hover:underline" onClick={() => setEditingLesson(lesson)}>Edit</button><button className="text-cyan-800 hover:underline" onClick={() => togglePublished(lesson)}>{lesson.published ? 'Unpublish' : 'Publish'}</button><button className="text-rose-700 hover:underline" onClick={() => deleteLesson(lesson)}>Delete</button></div>
              </article>
            ))}</div> : <p className="text-sm text-slate-500">No lessons have been seeded or created.</p>}
          </Panel>
        </div>
      )}

      {section === 'exercises' && (
        <div className="space-y-6">
          <Panel title={editingExercise ? `Edit exercise · ${editingExercise.id}` : 'Create an exercise or quiz question'}>
            {!state.lessons.length ? <p className="text-sm text-slate-600">Create or seed a lesson before adding exercises.</p> : (
              <form key={editingExercise?.id || 'new'} className="grid gap-4 md:grid-cols-2" onSubmit={saveExercise}>
                <label className="block text-sm font-medium text-slate-700">Associated lesson<select name="lesson_id" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" defaultValue={editingExercise?.lesson_id || state.lessons[0].id}>{state.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
                <label className="block text-sm font-medium text-slate-700">Difficulty<select name="difficulty" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" defaultValue={editingExercise?.difficulty || 'Beginner'}>{DIFFICULTIES.map((level) => <option key={level}>{level}</option>)}</select></label>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">Question<textarea name="question" required maxLength={1000} defaultValue={editingExercise?.question || ''} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                {[0, 1, 2, 3].map((index) => <Field key={index} label={`Option ${String.fromCharCode(65 + index)}`} name={`option-${index}`} defaultValue={editingExercise?.options[index] || ''} required={index < 2} maxLength={500} />)}
                <label className="block text-sm font-medium text-slate-700">Correct answer<select name="correct_index" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" defaultValue={editingExercise?.correct_index ?? 0}>{[0, 1, 2, 3].map((index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></label>
                <label className="block text-sm font-medium text-slate-700">Explanation<textarea name="explanation" required maxLength={2000} defaultValue={editingExercise?.explanation || ''} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="published" defaultChecked={editingExercise?.published || false} /> Publish immediately</label>
                <div className="flex flex-wrap gap-2 md:justify-end"><button className="primary-button" type="submit">{editingExercise ? 'Save changes' : 'Create exercise'}</button>{editingExercise && <button className="secondary-button" type="button" onClick={() => setEditingExercise(null)}>Cancel edit</button>}</div>
              </form>
            )}
          </Panel>
          <Panel title={`Exercises and quizzes · ${state.exercises.length}`}>
            {state.exercises.length ? <div className="space-y-3">{state.exercises.map((exercise) => {
              const lesson = state.lessons.find((item) => item.id === exercise.lesson_id);
              return <article key={exercise.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-slate-900">{exercise.question}</p><span className={`h-fit rounded-full px-2 py-1 text-xs ${exercise.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{exercise.published ? 'Published' : 'Draft'}</span></div><p className="mt-1 text-xs text-slate-500">{lesson?.title || exercise.lesson_id} · {exercise.difficulty} · {exercise.id}</p><div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold"><button className="text-cyan-800 hover:underline" onClick={() => setEditingExercise(exercise)}>Edit</button><button className="text-cyan-800 hover:underline" onClick={() => toggleExercise(exercise)}>{exercise.published ? 'Unpublish' : 'Publish'}</button><button className="text-rose-700 hover:underline" onClick={() => deleteExercise(exercise)}>Delete</button></div></article>;
            })}</div> : <p className="text-sm text-slate-500">No exercises have been seeded or created.</p>}
          </Panel>
        </div>
      )}

      {section === 'analytics' && (
        <div className="space-y-6">
          <Panel title="Learning analytics filters" action={<button className="primary-button" onClick={loadAnalytics}>Apply filters</button>}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="From" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <Field label="To" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              <label className="block text-sm font-medium text-slate-700">Student<select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" value={analyticsStudent} onChange={(event) => setAnalyticsStudent(event.target.value)}><option value="">All students</option>{state.students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</select></label>
            </div>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Lesson completions" value={state.analytics?.total_completions} hint="Recorded completion events" icon={GraduationCap} tint="bg-cyan-50 text-cyan-700" />
            <Stat label="Exercise attempts" value={state.analytics?.exercise_attempts} hint="Submitted answers" icon={CircleHelp} tint="bg-violet-50 text-violet-700" />
            <Stat label="Exercise accuracy" value={`${state.analytics?.exercise_accuracy ?? 0}%`} hint="Correct answers / total answers" icon={Activity} tint="bg-emerald-50 text-emerald-700" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Lesson completions by topic">{state.analytics?.lesson_completions_by_topic?.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={state.analytics.lesson_completions_by_topic}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="topic" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="completions" fill="#0891b2" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500">No lesson completion data in this range.</p>}</Panel>
            <Panel title="Exercise accuracy · difficult items">{state.analytics?.exercise_performance?.length ? <div className="space-y-3">{[...state.analytics.exercise_performance].sort((a, b) => a.accuracy - b.accuracy).map((item) => <div key={item.exercise_id}><div className="flex justify-between gap-3 text-sm"><span className="line-clamp-1">{item.question}</span><strong>{item.accuracy}%</strong></div><div className="mt-1 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${item.accuracy < 60 ? 'bg-rose-500' : 'bg-cyan-600'}`} style={{ width: `${item.accuracy}%` }} /></div><p className="mt-1 text-xs text-slate-500">{item.attempts} answers</p></div>)}</div> : <p className="text-sm text-slate-500">No exercise submissions in this range.</p>}</Panel>
          </div>
        </div>
      )}

      {section === 'monitoring' && (
        <div className="space-y-6">
          <Panel title="Circuit preview activity · privacy-safe summaries">
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label="Simulations in selected period" value={state.circuits?.total_simulations} hint={`${state.circuits?.errors ?? 0} reported errors`} icon={BrainCircuit} tint="bg-cyan-50 text-cyan-700" />
              <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-slate-800">Gate totals</h3><div className="mt-2 flex gap-4 text-sm">{Object.entries(state.circuits?.gates_used || {}).map(([gate, count]) => <span key={gate}>{gate}: <strong>{count}</strong></span>)}</div></div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{state.circuits?.privacy}</p>
            {state.circuits?.frequent_configurations?.length ? <div className="mt-4 space-y-2">{state.circuits.frequent_configurations.map((config) => <div key={config.configuration_id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>Configuration {config.configuration_id}</span><span>{config.attempts} attempts</span></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No circuit activity recorded in this period.</p>}
          </Panel>
          <Panel title={`AI tutor monitoring · ${state.tutor?.interaction_count ?? '—'} interactions`}>
            <div className="grid gap-5 lg:grid-cols-[0.7fr,1.3fr]">
              <div><h3 className="mb-3 font-semibold text-slate-800">Common topics</h3>{state.tutor?.topics?.length ? state.tutor.topics.map((item) => <div key={item.topic} className="mb-2 flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{item.topic}</span><strong>{item.count}</strong></div>) : <p className="text-sm text-slate-500">No tutoring interactions recorded.</p>}<p className="mt-3 text-xs text-slate-500">Private user prompts and full conversation transcripts are not collected.</p></div>
              <div><h3 className="mb-3 font-semibold text-slate-800">Reported explanations</h3>{state.tutor?.reports?.length ? <div className="space-y-3">{state.tutor.reports.map((report) => <article key={report.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{report.topic} · {report.status}</p><time className="text-xs text-slate-500">{report.created_at ? new Date(report.created_at).toLocaleString() : ''}</time></div><p className="mt-2 text-sm text-slate-600">{report.issue}</p><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-cyan-800">Review flagged explanation</summary><p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">{report.explanation}</p></details>{report.verified_explanation && <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{report.verified_explanation}</p>}{report.status !== 'resolved' && <button className="primary-button mt-3" onClick={() => resolveReport(report)}>Resolve with verified explanation</button>}</article>)}</div> : <p className="text-sm text-slate-500">No tutor explanations have been reported.</p>}</div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
