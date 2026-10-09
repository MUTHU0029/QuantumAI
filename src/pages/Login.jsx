import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      const destination = location.state?.from?.pathname
        || (user.role === 'admin' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">QuantumLearn AI</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your student or administrator account.</p>

        {location.state?.registered && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            Account created. Sign in to continue.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button w-full" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New student? <Link className="font-semibold text-cyan-700 hover:underline" to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
