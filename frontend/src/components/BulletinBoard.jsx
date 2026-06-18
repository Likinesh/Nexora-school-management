import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const BulletinBoard = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Compose notice state
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    classroom: '' // empty string represents school-wide (null on backend)
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resAnnouncements = await apiClient.get('/api/announcements/');
      setAnnouncements(resAnnouncements.data);

      if (user?.role === 'ADMIN' || user?.role === 'TEACHER') {
        const resClassrooms = await apiClient.get('/api/classrooms/');
        setClassrooms(resClassrooms.data);
      }
    } catch (err) {
      setErrorMsg('Failed to load bulletin or classrooms data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        title: newNotice.title,
        content: newNotice.content,
        classroom: newNotice.classroom ? parseInt(newNotice.classroom) : null
      };

      await apiClient.post('/api/announcements/', payload);
      
      // Reset form
      setNewNotice({
        title: '',
        content: '',
        classroom: ''
      });

      // Reload feed
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to publish announcement.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Classroom &amp; School Bulletin</h2>
        <p className="mt-1 text-sm text-slate-400">
          Stay informed with important updates, school notices, and class announcements.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Feed List */}
        <div className={user?.role === 'PARENT' ? 'lg:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4'}>
          <h3 className="text-lg font-bold text-white mb-2">Notice Board</h3>
          
          {loading ? (
            <div className="text-slate-500 text-sm py-10">Loading bulletin board…</div>
          ) : announcements.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-2xl text-center text-sm text-slate-500">
              No announcements published yet.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-all relative overflow-hidden group">
                  {/* Left accent line for school-wide alerts vs class notices */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${a.classroom ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider self-start ${
                      a.classroom 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {a.classroom ? `${a.classroom_name} (${a.classroom_class_name})` : '📢 School-wide'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(a.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-white text-lg leading-tight">{a.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{a.content}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-850 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Published By</span>
                    <span className="font-semibold text-slate-200">
                      {a.author_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compose Form (Admin/Teacher only) */}
        {user?.role !== 'PARENT' && (
          <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl space-y-5 sticky top-24">
            <h3 className="text-lg font-bold text-white">Publish Announcement</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field Trip Permission Forms"
                  value={newNotice.title}
                  onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scope / Audience</label>
                <select
                  value={newNotice.classroom}
                  onChange={e => setNewNotice({ ...newNotice, classroom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">📢 School-wide (All Users)</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name} ({c.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Content / Message</label>
                <textarea
                  required
                  placeholder="Write your announcement details here..."
                  value={newNotice.content}
                  onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 h-32 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-violet-500/10 transition-all disabled:opacity-50"
              >
                {formLoading ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulletinBoard;
