import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (u, p) => {
    setErr('');
    setBusy(true);
    try {
      await login(u, p);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password } = creds;
    if (!username.trim() || !password) {
      setErr('Both fields are required.');
      return;
    }
    doLogin(username, password);
  };

  const quickLogin = (u, p) => {
    setCreds({ username: u, password: p });
    doLogin(u, p);
  };

  const shortcuts = [
    { label: 'Admin', icon: '🔑', u: 'admin', p: 'adminpassword' },
    { label: 'Teacher', icon: '📋', u: 'teacher', p: 'teacherpassword' },
    { label: 'Parent', icon: '🏡', u: 'parent', p: 'parentpassword' },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-2xl mb-5 shadow-lg shadow-violet-500/10">
          🏫
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Nexora</h1>
        <p className="mt-1.5 text-sm text-slate-400">School Management Platform</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl py-8 px-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {err && (
              <div className="flex items-start gap-2 rounded-xl bg-red-950/50 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <span>⚠️</span>
                <span>{err}</span>
              </div>
            )}

            <div>
              <label htmlFor="nx-username" className="block text-sm font-medium text-slate-300 mb-1">
                Username
              </label>
              <input
                id="nx-username"
                type="text"
                autoComplete="username"
                required
                value={creds.username}
                onChange={e => setCreds(p => ({ ...p, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition"
                placeholder="your_username"
              />
            </div>

            <div>
              <label htmlFor="nx-password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                id="nx-password"
                type="password"
                autoComplete="current-password"
                required
                value={creds.password}
                onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              Quick demo access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {shortcuts.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => quickLogin(s.u, s.p)}
                  disabled={busy}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/60 hover:border-slate-700 text-xs font-medium text-slate-300 transition disabled:opacity-50 cursor-pointer"
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
