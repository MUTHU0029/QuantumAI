function StatCard({ label, value, detail, accent = 'cyan' }) {
  const accentMap = {
    cyan: 'bg-cyan-50 text-cyan-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="panel p-4">
      <div className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accentMap[accent] || accentMap.cyan}`}>
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default StatCard;
