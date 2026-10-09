import { BarChart3, BookOpen, BrainCircuit, CircuitBoard, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/circuit-lab', label: 'Quantum Circuit Lab', icon: CircuitBoard },
  { to: '/ai-tutor', label: 'AI Tutor', icon: BrainCircuit },
  { to: '/progress', label: 'My Progress', icon: Sparkles },
];

const adminNavItems = [
  { to: '/admin', label: 'Admin dashboard', icon: BarChart3 },
];

function Sidebar({ open, onClose, role }) {
  const items = role === 'admin' ? adminNavItems : navItems;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 transition ${open ? 'opacity-100' : 'pointer-events-none opacity-0'} lg:hidden`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 -translate-x-full border-r border-slate-700 bg-slate-950 text-slate-100 transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : ''}`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="mb-8 flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-bold text-white shadow-lg shadow-cyan-500/30">
              Q
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">QuantumLearn</p>
              <h2 className="text-xl font-bold text-white">AI</h2>
            </div>
          </div>

          <nav className="space-y-2">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {role === 'student' && (
            <div className="mt-auto rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Course focus</p>
              <p className="mt-2 text-lg font-bold text-white">Qubit Foundations</p>
              <p className="mt-2 text-sm text-cyan-50/80">Sample learning content for beginner quantum computing.</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
