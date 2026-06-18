import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const ClassroomManager = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Classroom creation state
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    class_name: 'Grade 5-A',
    teacher: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resClassrooms = await apiClient.get('/api/classrooms/');
      setClassrooms(resClassrooms.data);

      if (user?.role === 'ADMIN') {
        const resTeachers = await apiClient.get('/api/users/teachers/');
        setTeachers(resTeachers.data);
      }
    } catch (err) {
      setErrorMsg('Failed to load classrooms or teachers data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newClassroom.name || !newClassroom.class_name) {
      setErrorMsg('Classroom Name and Class Name are required.');
      return;
    }

    try {
      const payload = {
        name: newClassroom.name,
        class_name: newClassroom.class_name,
        teacher: newClassroom.teacher ? parseInt(newClassroom.teacher) : null
      };

      await apiClient.post('/api/classrooms/', payload);
      
      // Reset form
      setNewClassroom({
        name: '',
        class_name: 'Grade 5-A',
        teacher: ''
      });

      // Reload
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create classroom.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Classrooms & Rosters</h2>
        <p className="mt-1 text-sm text-slate-400">
          View all active classes, academic cohorts, and assigned teachers.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Classroom List (Spans 2 columns if admin, full width if teacher) */}
        <div className={user?.role === 'ADMIN' ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
          <h3 className="text-lg font-bold text-white mb-2">Active Classrooms</h3>
          
          {loading ? (
            <div className="text-slate-500 text-sm py-10">Loading classrooms…</div>
          ) : classrooms.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-2xl text-center text-sm text-slate-500">
              No classrooms created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classrooms.map((c) => (
                <div key={c.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-3.5 hover:border-violet-500/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {c.class_name}
                    </span>
                    <span className="text-lg opacity-40 group-hover:opacity-150 transition-opacity">🏫</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base leading-tight">{c.name}</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Assigned Teacher</span>
                    <span className="font-semibold text-slate-200">
                      {c.teacher_name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Classroom Form (Only for Admin) */}
        {user?.role === 'ADMIN' && (
          <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl space-y-5">
            <h3 className="text-lg font-bold text-white">Create New Classroom</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Classroom Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Suite A"
                  value={newClassroom.name}
                  onChange={e => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Academic Level</label>
                <select
                  value={newClassroom.class_name}
                  onChange={e => setNewClassroom({ ...newClassroom, class_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Grade 1-A">Grade 1 - Section A</option>
                  <option value="Grade 2-A">Grade 2 - Section A</option>
                  <option value="Grade 3-A">Grade 3 - Section A</option>
                  <option value="Grade 4-A">Grade 4 - Section A</option>
                  <option value="Grade 5-A">Grade 5 - Section A (Primary)</option>
                  <option value="Grade 6-B">Grade 6 - Section B (Middle School)</option>
                  <option value="Grade 7-B">Grade 7 - Section B (Middle School)</option>
                  <option value="Grade 8-B">Grade 8 - Section B (Middle School)</option>
                  <option value="Grade 9-H">Grade 9 - Freshman (High School)</option>
                  <option value="Grade 10-H">Grade 10 - Sophomore (High School)</option>
                  <option value="Grade 11-AP">Grade 11 - Junior (AP Honors)</option>
                  <option value="Grade 12-AP">Grade 12 - Senior (AP Honors)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Teacher</label>
                <select
                  value={newClassroom.teacher}
                  onChange={e => setNewClassroom({ ...newClassroom, teacher: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-violet-500/10 transition-all mt-2"
              >
                Provision Classroom
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomManager;
