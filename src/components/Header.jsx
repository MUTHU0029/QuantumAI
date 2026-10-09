import { LogOut, Menu } from 'lucide-react';

function Header({ title, onMenuClick, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">QuantumLearn AI</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button type="button" className="ghost-button px-3 py-2 text-xs" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
