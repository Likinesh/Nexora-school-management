import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import AttendanceTracker from './components/AttendanceTracker';
import FeeLedger from './components/FeeLedger';
import apiClient from './services/api';

const DashboardContent = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'PARENT') return 'invoices';
    return 'attendance';
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/api/notifications/');
      setNotifications(response.data);
      const unreads = response.data.filter(n => !n.is_read).length;
      setUnreadCount(unreads);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const intervalId = setInterval(fetchNotifications, 10000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await apiClient.post('/api/notifications/read-all/');
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const hasAccess = (tab) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'TEACHER' && tab === 'attendance') return true;
    if (user?.role === 'PARENT') return true;
    return false;
  };

  return (
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <nav class="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <span class="text-2xl mr-2">🎓</span>
              <span class="font-extrabold text-lg bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">eduTinker Hub</span>
            </div>

            <div class="flex items-center space-x-6">
              <div class="relative">
                <button onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} class="relative p-2 text-slate-400 hover:text-white cursor-pointer">
                  <span class="text-xl">🔔</span>
                  {unreadCount > 0 && <span class="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-bounce">{unreadCount}</span>}
                </button>

                {showNotificationsDropdown && (
                  <div class="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-96 overflow-y-auto">
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 class="font-bold text-xs text-white">System Alerts</h3>
                      {unreadCount > 0 && <button onClick={handleMarkAllRead} class="text-[10px] text-indigo-400 font-semibold cursor-pointer">Clear marks</button>}
                    </div>
                    <div class="divide-y divide-slate-800/80">
                      {notifications.length === 0 ? (
                        <div class="p-6 text-center text-xs text-slate-500">No alerts yet.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} class={`p-4 text-xs flex items-start space-x-2.5 ${!notif.is_read ? 'bg-indigo-950/20' : ''}`}>
                            <span class={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${!notif.is_read ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                            <div>
                              <p class={`leading-relaxed ${!notif.is_read ? 'text-white font-medium' : 'text-slate-400'}`}>{notif.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div class="text-right hidden sm:block">
                <span class="text-xs font-bold text-indigo-400">{user?.username} ({user?.role})</span>
              </div>
              <button onClick={logout} class="px-4 py-2 border border-slate-800 bg-slate-950 rounded-xl text-xs font-semibold text-slate-300">Log Out</button>
            </div>
          </div>
        </div>
      </nav>

      <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        <aside class="w-full md:w-64 shrink-0">
          <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 sticky top-24">
            {hasAccess('attendance') && (
              <button onClick={() => setActiveTab('attendance')} class={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <span class="text-lg mr-3">📝</span>
                <span>Attendance Tracker</span>
              </button>
            )}
            {hasAccess('invoices') && (
              <button onClick={() => setActiveTab('invoices')} class={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <span class="text-lg mr-3">💳</span>
                <span>Fee & Invoice Ledger</span>
              </button>
            )}
          </div>
        </aside>

        <main class="flex-1 min-w-0 bg-slate-900/20 border border-slate-800/55 rounded-2xl p-6 shadow-sm min-h-[500px]">
          {activeTab === 'attendance' && hasAccess('attendance') && <AttendanceTracker />}
          {activeTab === 'invoices' && hasAccess('invoices') && <FeeLedger />}
        </main>
      </div>

      <footer class="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 eduTinker Corporation. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

const AppShell = () => {
  const { user, loading } = useAuth();
  if (loading) return <div class="min-h-screen bg-slate-950 flex items-center justify-center">Loading...</div>;
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
