import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import AttendanceTracker from './components/AttendanceTracker';
import FeeLedger from './components/FeeLedger';

const DashboardContent = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'PARENT') return 'invoices';
    return 'attendance';
  });

  // Helper determining tab accessibility
  const hasAccess = (tab) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'TEACHER' && tab === 'attendance') return true;
    if (user?.role === 'PARENT') return true; // Expose attendance checks and invoices for parents
    return false;
  };

  return (
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Premium Main Dashboard Navbar Header */}
      <nav class="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <span class="text-2xl mr-2">🎓</span>
              <span class="font-extrabold text-lg bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                eduTinker Hub
              </span>
            </div>

            {/* Profile and Logout Actions */}
            <div class="flex items-center space-x-4">
              <div class="text-right hidden sm:block">
                <span class="block text-xs text-slate-400 font-medium">Logged in as</span>
                <span class="text-sm font-semibold text-indigo-400">
                  {user?.username} ({user?.role})
                </span>
              </div>
              
              <button
                onClick={logout}
                class="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/50 rounded-xl text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition duration-150 cursor-pointer shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar Drawer */}
        <aside class="w-full md:w-64 shrink-0">
          <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 sticky top-24">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Workspace Console
            </p>

            {hasAccess('attendance') && (
              <button
                onClick={() => setActiveTab('attendance')}
                class={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition duration-150 cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <span class="text-lg mr-3">📝</span>
                <span>Attendance Tracker</span>
              </button>
            )}

            {hasAccess('invoices') && (
              <button
                onClick={() => setActiveTab('invoices')}
                class={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition duration-150 cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <span class="text-lg mr-3">💳</span>
                <span>Fee & Invoice Ledger</span>
              </button>
            )}


          </div>
        </aside>

        {/* Dashboard Frame Content */}
        <main class="flex-1 min-w-0 bg-slate-900/20 border border-slate-800/55 rounded-2xl p-6 shadow-sm min-h-[500px]">
          {activeTab === 'attendance' && hasAccess('attendance') && <AttendanceTracker />}
          {activeTab === 'invoices' && hasAccess('invoices') && <FeeLedger />}
        </main>
      </div>

      {/* Footer Branding */}
      <footer class="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 eduTinker EdTech Corporation. Decoupled Classroom & Fee MVP. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

const AppShell = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center flex-col">
        <svg class="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm font-medium text-slate-400">Restoring authentication context...</span>
      </div>
    );
  }

  return user ? <DashboardContent /> : <Login />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;
