function CircuitWire({ wireIndex, gates = [] }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-8 text-right text-sm font-semibold text-slate-500">q{wireIndex}</span>
      <div className="relative flex min-h-9 min-w-0 flex-1 items-center overflow-x-auto">
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-300" />
        {gates.map((gate) => {
          const isTarget = gate.target === wireIndex;
          const isControl = gate.gateType === 'CNOT' && gate.control === wireIndex;
          const label = gate.gateType === 'CNOT'
            ? (isControl ? '●' : isTarget ? '⊕' : '')
            : isTarget ? gate.gateType : '';
          const color = gate.gateType === 'CNOT'
            ? 'border-violet-200 bg-violet-100 text-violet-700'
            : gate.gateType === 'H'
              ? 'border-cyan-200 bg-cyan-100 text-cyan-700'
              : 'border-blue-200 bg-blue-100 text-blue-700';

          return (
            <div key={gate.id} className="relative z-10 flex min-w-[58px] shrink-0 justify-center">
              {label
                ? <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-xs font-bold ${color}`}>{label}</span>
                : <span className="h-7 w-7" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CircuitWire;
