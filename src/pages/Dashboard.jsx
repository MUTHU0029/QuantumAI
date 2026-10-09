import { ArrowRight, BookOpen, CheckCircle2, Rocket, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { lessons } from '../data/lessons';
import { getProgress } from '../services/progressService';

function Dashboard() {
  const progress = getProgress();
  const recommended = lessons.slice(0, 5);
  const completionRate = Math.min(100, Math.round((progress.completedLessons.length / lessons.length) * 100));

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 p-6 text-white shadow-xl shadow-slate-900/10 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Welcome back</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Explore Quantum Computing. Build Circuits. Understand the Future.</h2>
            <p className="mt-4 max-w-2xl text-sm text-slate-200 md:text-base">
              Start with the foundations of qubits, gates, and superposition in a beginner-friendly learning path built for college students.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to="/learn" className="primary-button bg-white text-slate-900 hover:bg-slate-100">
              Continue Learning
            </Link>
            <Link to="/circuit-lab" className="secondary-button border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              Open Circuit Lab
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total lessons" value={lessons.length} detail="Core quantum topics" accent="cyan" />
        <StatCard label="Completed" value={progress.completedLessons.length} detail="Lessons finished" accent="blue" />
        <StatCard label="Exercises" value={progress.exercisesAttempted} detail="Practice attempts" accent="emerald" />
        <StatCard label="Avg. quiz" value={`${Math.round(progress.quizHistory.reduce((sum, value) => sum + value, 0) / progress.quizHistory.length)}%`} detail="Sample score preview" accent="violet" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Recommended learning modules</h3>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">Sample content</span>
          </div>

          <div className="space-y-4">
            {recommended.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{lesson.title}</p>
                    <p className="text-sm text-slate-500">{lesson.duration}</p>
                  </div>
                </div>
                <Link to={`/learn/${lesson.id}`} className="secondary-button px-3 py-2 text-xs">
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Recent learning activity</h3>
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </div>

          <div className="space-y-4">
            {[
              'Completed: Introduction to Qubits',
              'Reviewed: Quantum Gates overview',
              'Practiced: Superposition quiz',
              'Opened: Entanglement lesson',
            ].map((entry) => (
              <div key={entry} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-slate-600">{entry}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Beginner learning path</h3>
            <span className="text-sm font-medium text-cyan-700">{completionRate}% complete</span>
          </div>
          <div className="space-y-3">
            {['Qubits', 'Gates', 'Superposition', 'Entanglement', 'Algorithms'].map((step, index) => {
              const active = index < progress.completedLessons.length || index === 0;
              return (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{step}</p>
                    <p className="text-sm text-slate-500">{active ? 'Unlocked' : 'Locked for later'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Learning progress summary</h3>
            <Rocket className="h-5 w-5 text-violet-500" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Course completion</span>
                <span>{completionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Next milestone</p>
              <p className="mt-2 text-lg font-bold text-slate-900">Superposition lesson</p>
              <p className="mt-2 text-sm text-slate-600">Keep the momentum going with one more interactive circuit.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
