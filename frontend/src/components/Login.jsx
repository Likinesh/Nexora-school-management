import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper shortcut for easy testing and evaluation
  const handleQuickLogin = async (roleName, userVal, passVal) => {
    setError('');
    setLoading(true);
    setUsername(userVal);
    setPassword(passVal);
    try {
      await login(userVal, passVal);
    } catch (err) {
      console.error(err);
      setError(`Failed to quick-login as ${roleName}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span class="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-3xl shadow-lg shadow-indigo-500/5 mb-4">
          🎓
        </span>
        <h2 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          eduTinker Hub
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          Unified Classroom Attendance & Fee Ledger
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-slate-900/60 backdrop-blur-xl border border-slate-800 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          <form class="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div class="rounded-xl bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-400">
                <div class="flex">
                  <span class="mr-2 text-base">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" class="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  class="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-sm"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" class="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  class="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                class="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span class="inline-flex items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing you in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Quick-Testing Presets Section */}
          <div class="mt-8 border-t border-slate-800 pt-6">
            <p class="text-xs font-semibold text-slate-400 tracking-wider uppercase text-center mb-4">
              Developer Demo Sign In
            </p>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin', 'admin', 'adminpassword')}
                class="inline-flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 hover:border-slate-700 transition duration-150 text-xs font-medium text-slate-300 cursor-pointer"
              >
                <span class="text-lg mb-1">🔑</span>
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Teacher', 'teacher', 'teacherpassword')}
                class="inline-flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 hover:border-slate-700 transition duration-150 text-xs font-medium text-slate-300 cursor-pointer"
              >
                <span class="text-lg mb-1">📝</span>
                <span>Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Parent', 'parent', 'parentpassword')}
                class="inline-flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 hover:border-slate-700 transition duration-150 text-xs font-medium text-slate-300 cursor-pointer"
              >
                <span class="text-lg mb-1">🏠</span>
                <span>Parent</span>
              </button>
            </div>
            <p class="text-[10px] text-center text-slate-500 mt-4 leading-normal">
              Quickly cycle between admin, teacher, or parent contexts. Database will dynamically isolate and optimize data streams accordingly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
