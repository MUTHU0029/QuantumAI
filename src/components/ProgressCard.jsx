function ProgressCard({ title, value, caption, color }) {
  const colorMap = {
    cyan: 'bg-cyan-50 text-cyan-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="panel p-4">
      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colorMap[color] || colorMap.cyan}`}>
        {title}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <p className="mt-2 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

export default ProgressCard;
