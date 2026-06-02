import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import AttendanceTracker from './components/AttendanceTracker';
import FeeLedger from './components/FeeLedger';
import UserManagement from './components/UserManagement';
import apiClient from './services/api';

function NotifBell({ count, onClick }) {
  return (
    <button onClick={onClick} className="relative p-2 text-slate-400 hover:text-white cursor-pointer">
      <span className="text-xl">🔔</span>
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-bounce">
          {count}
        </span>
      )}
    </button>
  );
}

function NotifDropdown({ items, onMarkRead }) {
  return (
    <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-96 overflow-y-auto z-50">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-xs text-white">Activity Feed</h3>
        {items.some(n => !n.is_read) && (
          <button onClick={onMarkRead} className="text-[10px] text-indigo-400 font-semibold cursor-pointer">
            Mark all read
          </button>
        )}
      </div>
      <div className="divide-y divide-slate-800/80">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">Nothing here yet.</div>
        ) : (
          items.map(n => (
            <div key={n.id} className={`p-4 text-xs flex items-start gap-2.5 ${!n.is_read ? 'bg-indigo-950/20' : ''}`}>
              <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${!n.is_read ? 'bg-indigo-400' : 'bg-slate-700'}`} />
              <p className={`leading-relaxed ${!n.is_read ? 'text-white font-medium' : 'text-slate-400'}`}>
                {n.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, role }) {
  const items = [];
  items.push({ key: 'attendance', icon: '📝', label: 'Attendance' });
  if (role !== 'TEACHER') items.push({ key: 'invoices', icon: '💳', label: 'Fee Ledger' });
  if (role === 'ADMIN') items.push({ key: 'users', icon: '👥', label: 'User Hub' });

  return (
    <aside className="w-full md:w-60 shrink-0">
      <nav className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3 space-y-1 sticky top-24">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              active === item.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const defaultTab = user?.role === 'PARENT' ? 'invoices' : 'attendance';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [notifs, setNotifs] = useState([]);
  const [showDrop, setShowDrop] = useState(false);

  const unread = notifs.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const res = await apiClient.get('/api/notifications/');
        setNotifs(res.data);
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [user]);

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await apiClient.post('/api/notifications/read-all/');
    } catch (_) {
      const res = await apiClient.get('/api/notifications/');
      setNotifs(res.data);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏫</span>
              <span className="font-extrabold text-lg bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
                Nexora
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <NotifBell count={unread} onClick={() => setShowDrop(p => !p)} />
                {showDrop && <NotifDropdown items={notifs} onMarkRead={markAllRead} />}
              </div>
              <span className="text-xs font-semibold text-slate-400 hidden sm:block">
                {user?.username} · <span className="text-indigo-400">{user?.role}</span>
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 border border-slate-700 bg-slate-900 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        <Sidebar active={activeTab} setActive={setActiveTab} role={user?.role} />
        <main className="flex-1 min-w-0 bg-slate-900/20 border border-slate-800/50 rounded-2xl p-6 shadow-sm min-h-[500px]">
          {activeTab === 'attendance' && <AttendanceTracker />}
          {activeTab === 'invoices' && user?.role !== 'TEACHER' && <FeeLedger />}
          {activeTab === 'users' && user?.role === 'ADMIN' && <UserManagement />}
        </main>
      </div>

      <footer className="border-t border-slate-900 py-5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Nexora. Built for modern schools.
      </footer>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }
  return user ? <DashboardContent /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
