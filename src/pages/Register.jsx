import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">QuantumLearn AI</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Create a student account</h1>
        <p className="mt-2 text-sm text-slate-600">Student access is assigned by the server.</p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              type="email"
              autoComplete="email"
              maxLength={254}
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
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-500">Use 12–128 characters.</span>
          </label>
          <button className="primary-button w-full" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered? <Link className="font-semibold text-cyan-700 hover:underline" to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
