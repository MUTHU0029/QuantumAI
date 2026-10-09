function CircuitWire({ wireIndex, gates = [] }) {
  const gateSegments = gates.filter((gate) => gate.target === wireIndex || gate.control === wireIndex);

  if (!gateSegments.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="w-8 text-right text-sm font-semibold text-slate-500">q{wireIndex}</span>
        <div className="h-px flex-1 bg-slate-300" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-8 text-right text-sm font-semibold text-slate-500">q{wireIndex}</span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        <div className="h-px min-w-[70px] flex-1 bg-slate-300" />
        {gateSegments.map((gate) => (
          <div
            key={gate.id}
            className={`inline-flex min-w-[52px] items-center justify-center rounded-lg border px-2 py-1 text-xs font-bold ${
              gate.gateType === 'CNOT'
                ? 'border-violet-200 bg-violet-100 text-violet-700'
                : gate.gateType === 'H'
                  ? 'border-cyan-200 bg-cyan-100 text-cyan-700'
                  : 'border-blue-200 bg-blue-100 text-blue-700'
            }`}
          >
            {gate.gateType === 'CNOT' ? (gate.control === wireIndex ? '●' : 'X') : gate.gateType}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CircuitWire;
