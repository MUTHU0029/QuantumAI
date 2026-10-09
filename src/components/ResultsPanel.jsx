import { BarChart3, Loader } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function ResultsPanel({ simulation, loading, error }) {
  const counts = Object.entries(simulation?.counts || {}).map(([label, value]) => ({
    label,
    value,
    probability: simulation.probabilities[label] ?? 0,
  }));

  if (loading) {
    return (
      <div className="panel flex min-h-[260px] items-center justify-center p-6 text-center text-slate-500">
        <div>
          <Loader className="mx-auto h-7 w-7 animate-spin text-cyan-600" />
          <p className="mt-3 text-sm font-medium">Running Qiskit statevector simulation...</p>
        </div>
      </div>
    );
  }

  if (error && !simulation) {
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
        Run the circuit to see actual Qiskit statevector and shot-based measurement results.
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Simulation results</h3>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <BarChart3 className="h-3.5 w-3.5" />
          Qiskit · {simulation.shots} shots
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" />
            <YAxis stroke="#64748b" unit="%" domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}%`, 'Probability']} />
            <Bar dataKey="probability" fill="#0891b2" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Measurement counts</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {counts.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between">
                <span>{entry.label} <span className="text-xs text-slate-500">({entry.probability}%)</span></span>
                <span className="font-semibold">{entry.value} shots</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Final statevector</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {simulation.statevector.map((entry) => (
              <p key={entry.state}>|{entry.state}⟩: {entry.real}{entry.imaginary < 0 ? ' − ' : ' + '}{Math.abs(entry.imaginary)}i</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">What happened</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{simulation.explanation}</p>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-cyan-100">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Measured circuit</p>
        <pre className="mt-3 overflow-x-auto text-xs leading-5">{simulation.circuit}</pre>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Bit order: {simulation.bit_order} Probabilities are estimated from the measured shots.
      </p>
    </div>
  );
}

export default ResultsPanel;
