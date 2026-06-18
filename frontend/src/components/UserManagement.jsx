import React, { useState } from 'react';
import apiClient from '../services/api';

const UserManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('teacher'); // 'teacher' or 'parent'
  
  // Teacher form state
  const [teacherForm, setTeacherForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    date_of_birth: ''
  });

  // Parent + Student form state
  const [parentForm, setParentForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    student_first_name: '',
    student_last_name: '',
    student_date_of_birth: '',
    class_name: 'Grade 5-A'
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [createdUser, setCreatedUser] = useState(null); // stores the successful creation payload
  const [copySuccess, setCopySuccess] = useState(false);

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setCreatedUser(null);
    setCopySuccess(false);

    try {
      const res = await apiClient.post('/api/users/create-teacher/', teacherForm);
      setCreatedUser({
        type: 'teacher',
        username: res.data.username,
        email: res.data.email,
        name: `${res.data.first_name} ${res.data.last_name}`,
        password: res.data.raw_password
      });
      // Clear form
      setTeacherForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        date_of_birth: ''
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'An error occurred while creating the teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setCreatedUser(null);
    setCopySuccess(false);

    try {
      const res = await apiClient.post('/api/users/create-parent/', parentForm);
      setCreatedUser({
        type: 'parent',
        username: res.data.parent.username,
        email: res.data.parent.email,
        studentName: `${res.data.student.first_name} ${res.data.student.last_name}`,
        studentClass: res.data.student.class_name,
        password: res.data.raw_password
      });
      // Clear form
      setParentForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        student_first_name: '',
        student_last_name: '',
        student_date_of_birth: '',
        class_name: 'Grade 5-A'
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'An error occurred while creating the parent.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-8 relative">
      {/* Title Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Nexora User Management Hub</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create administrative accounts, teacher roster credentials, and parent-student linkages.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => { setActiveSubTab('teacher'); setErrorMsg(null); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'teacher'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          🎓 Add New Teacher
        </button>
        <button
          onClick={() => { setActiveSubTab('parent'); setErrorMsg(null); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'parent'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          👨‍👩‍👦 Add New Parent & Student
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Success Modal overlay */}
      {createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
            
            <div className="text-center space-y-2">
              <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-400 text-2xl font-bold border border-emerald-500/20 animate-pulse">
                ✓
              </span>
              <h3 className="text-xl font-bold text-white">Account Provisioned!</h3>
              <p className="text-xs text-slate-400">Credentials have been generated successfully.</p>
            </div>

            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80 space-y-3.5">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Role</span>
                <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase">
                  {createdUser.type}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Username</span>
                <span className="text-sm font-semibold text-white">{createdUser.username}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Email Address</span>
                <span className="text-sm font-medium text-slate-300">{createdUser.email}</span>
              </div>
              {createdUser.type === 'teacher' ? (
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Teacher Name</span>
                  <span className="text-sm font-medium text-slate-300">{createdUser.name}</span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Student Name</span>
                    <span className="text-sm font-medium text-slate-300">{createdUser.studentName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Class Roster</span>
                    <span className="text-sm font-medium text-slate-300">{createdUser.studentClass}</span>
                  </div>
                </>
              )}
              
              <div className="pt-2 border-t border-slate-800/60">
                <span className="block text-[10px] uppercase tracking-wider text-amber-500 font-bold">Default Password</span>
                <div className="flex items-center justify-between gap-2 mt-1 bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <code className="text-xs font-bold text-white tracking-wide">{createdUser.password}</code>
                  <button
                    onClick={() => copyToClipboard(createdUser.password)}
                    className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCreatedUser(null)}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-violet-500/10 transition-all"
            >
              Done & Return
            </button>
          </div>
        </div>
      )}

      {/* Forms Workspace */}
      <div className="bg-slate-900/20 border border-slate-850 p-6 sm:p-8 rounded-3xl">
        {activeSubTab === 'teacher' ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-6 max-w-xl">
            <h3 className="text-lg font-bold text-white">Create Teacher Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe_teacher"
                  value={teacherForm.username}
                  onChange={e => setTeacherForm({ ...teacherForm, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="teacher@nexora.com"
                  value={teacherForm.email}
                  onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  value={teacherForm.first_name}
                  onChange={e => setTeacherForm({ ...teacherForm, first_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Doe"
                  value={teacherForm.last_name}
                  onChange={e => setTeacherForm({ ...teacherForm, last_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={teacherForm.date_of_birth}
                  onChange={e => setTeacherForm({ ...teacherForm, date_of_birth: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Used for password generation format: <code className="text-violet-400">firstname@dob</code>
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Register Teacher Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleParentSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Parent Info */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-white border-b border-slate-800/80 pb-2">👨‍👩‍👦 Parent Profile</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parent Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bsmith_parent"
                    value={parentForm.username}
                    onChange={e => setParentForm({ ...parentForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parent Email</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={parentForm.email}
                    onChange={e => setParentForm({ ...parentForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={parentForm.first_name}
                      onChange={e => setParentForm({ ...parentForm, first_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={parentForm.last_name}
                      onChange={e => setParentForm({ ...parentForm, last_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Student Info */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-white border-b border-slate-800/80 pb-2">🎒 Student Demographics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Billy"
                      value={parentForm.student_first_name}
                      onChange={e => setParentForm({ ...parentForm, student_first_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Smith"
                      value={parentForm.student_last_name}
                      onChange={e => setParentForm({ ...parentForm, student_last_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Student Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={parentForm.student_date_of_birth}
                    onChange={e => setParentForm({ ...parentForm, student_date_of_birth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Parent password generated from student details: <code className="text-violet-400">student_first_name@dob</code>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Classroom Assignment</label>
                  <select
                    value={parentForm.class_name}
                    onChange={e => setParentForm({ ...parentForm, class_name: e.target.value })}
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
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Register Parent & Student'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
