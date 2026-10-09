import { Sparkles } from 'lucide-react';
import { gateMeta } from '../utils/circuitUtils';

function GateSelector({ selectedGate, setGateType, onAdd, onRemove, onReset, qubits, setQubits, shots, setShots, canAdd }) {
  return (
    <div className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Circuit controls</h3>
        <div className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
          <Sparkles className="h-3.5 w-3.5" />
          Local Qiskit simulator
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Number of qubits</label>
          <select
            value={qubits}
            onChange={(event) => setQubits(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          >
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Shots</label>
          <select
            value={shots}
            onChange={(event) => setShots(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          >
            {[100, 500, 1000, 5000].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-slate-700">Add gate</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(gateMeta).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setGateType(key)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                selectedGate === key
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50'
              }`}
            >
              {gateMeta[key].label}
            </button>
          ))}
        </div>
      </div>

      {selectedGate ? (
        <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-slate-700">
          <span className="font-semibold text-cyan-700">{gateMeta[selectedGate].label} gate:</span> {gateMeta[selectedGate].description}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="primary-button" onClick={onAdd} disabled={!canAdd}>
          Add Gate
        </button>
        <button type="button" className="secondary-button" onClick={onRemove}>
          Remove Gate
        </button>
        <button type="button" className="ghost-button" onClick={onReset}>
          Reset Circuit
        </button>
      </div>
    </div>
  );
}

export default GateSelector;
