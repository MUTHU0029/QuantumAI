import { BarChart3, Loader } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function ResultsPanel({ simulation, loading, error }) {
  if (loading) {
    return (
      <div className="panel flex min-h-[260px] items-center justify-center p-6 text-center text-slate-500">
        <div>
          <Loader className="mx-auto h-7 w-7 animate-spin text-cyan-600" />
          <p className="mt-3 text-sm font-medium">Preparing illustrative measurement preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Circuit error</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="panel p-6 text-sm text-slate-500">
        Run the circuit to inspect a roadmap of outputs.
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Simulation results</h3>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <BarChart3 className="h-3.5 w-3.5" />
          Preview state
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={simulation.counts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Bar dataKey="value" fill="#0891b2" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Measurement counts</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {simulation.counts.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between">
                <span>{entry.label}</span>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Expected result</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{simulation.expectedResult}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Circuit summary</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{simulation.summary}</p>
      </div>
    </div>
  );
}

export default ResultsPanel;
