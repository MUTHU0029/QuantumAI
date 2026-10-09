import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProgressCard from '../components/ProgressCard';
import { getProgress } from '../services/progressService';

function Progress() {
  const [progress, setProgress] = useState(getProgress());

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  const chartData = [
    { name: 'Week 1', score: 68 },
    { name: 'Week 2', score: 72 },
    { name: 'Week 3', score: 80 },
    { name: 'Week 4', score: 87 },
  ];

  const completedLessons = [
    'Introduction to Qubits',
    'Quantum Gates',
    'Superposition',
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressCard title="Overall completion" value={`${Math.min(100, Math.round((progress.completedLessons.length / 5) * 100))}%`} caption="Course progress" color="cyan" />
        <ProgressCard title="Lessons completed" value={progress.completedLessons.length} caption="Finished topics" color="blue" />
        <ProgressCard title="Exercises attempted" value={progress.exercisesAttempted} caption="Practice count" color="violet" />
        <ProgressCard title="Correct answers" value={progress.correctAnswers} caption="With sample data" color="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="panel p-5">
          <h3 className="text-xl font-bold text-slate-900">Quiz performance</h3>
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#0891b2" fill="url(#scoreGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-xl font-bold text-slate-900">Completed lessons</h3>
          <div className="mt-5 space-y-3">
            {completedLessons.map((lesson, index) => (
              <div key={lesson} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{lesson}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Done</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-xl font-bold text-slate-900">Learning activity summary</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Study streak</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">4 days</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Focus time</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">1.8h</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Next goal</p>
            <p className="mt-3 text-lg font-bold text-slate-900">Complete entanglement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Progress;
