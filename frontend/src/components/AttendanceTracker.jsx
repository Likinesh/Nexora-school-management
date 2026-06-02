import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const fetchStudents = (className) =>
  apiClient.get('/api/students/', { params: { class_name: className } }).then(r => r.data);

const fetchAttendance = (date, className) =>
  apiClient.get('/api/attendance/', { params: { date, class_name: className } }).then(r => r.data);

const postAttendance = (payload) =>
  apiClient.post('/api/attendance/', payload).then(r => r.data);

const postBulkAttendance = (payload) =>
  apiClient.post('/api/attendance/bulk/', payload).then(r => r.data);

const postBulkStudents = (payload) =>
  apiClient.post('/api/students/bulk/', payload).then(r => r.data);

const buildAttendanceMap = (records) => {
  const map = {};
  records.forEach(rec => { map[rec.student] = rec; });
  return map;
};

const AttendanceTracker = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('Grade 5-A');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [banner, setBanner] = useState(null);
  const [showImporter, setShowImporter] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const fileInputRef = useRef(null);

  const ATTENDANCE_KEY = ['attendance', selectedDate, selectedClass];
  const STUDENTS_KEY = ['students', selectedClass];

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: () => fetchStudents(selectedClass),
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ATTENDANCE_KEY,
    queryFn: () => fetchAttendance(selectedDate, selectedClass),
  });

  const attendanceMap = buildAttendanceMap(attendanceRecords);
  const loading = studentsLoading || attendanceLoading;

  const toggleMutation = useMutation({
    mutationFn: postAttendance,
    onMutate: async ({ student, status }) => {
      await qc.cancelQueries({ queryKey: ATTENDANCE_KEY });
      const previous = qc.getQueryData(ATTENDANCE_KEY);
      qc.setQueryData(ATTENDANCE_KEY, (old = []) => {
        const filtered = old.filter(r => r.student !== student);
        return [...filtered, { student, date: selectedDate, status }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(ATTENDANCE_KEY, ctx.previous);
      setBanner({ type: 'error', text: 'Sync failed — changes rolled back.' });
    },
    onSuccess: (data) => {
      qc.setQueryData(ATTENDANCE_KEY, (old = []) => {
        const filtered = old.filter(r => r.student !== data.student);
        return [...filtered, data];
      });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: postBulkAttendance,
    onMutate: async ({ records, date }) => {
      await qc.cancelQueries({ queryKey: ATTENDANCE_KEY });
      const previous = qc.getQueryData(ATTENDANCE_KEY);
      const optimistic = records.map(r => ({ student: r.student, date, status: r.status }));
      qc.setQueryData(ATTENDANCE_KEY, optimistic);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(ATTENDANCE_KEY, ctx.previous);
      setBanner({ type: 'error', text: 'Bulk sync failed — rolled back.' });
    },
    onSuccess: (data) => {
      qc.setQueryData(ATTENDANCE_KEY, data);
      setBanner({ type: 'success', text: `Marked ${data.length} students successfully!` });
    },
  });

  const csvMutation = useMutation({
    mutationFn: postBulkStudents,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STUDENTS_KEY });
      setBanner({ type: 'success', text: `Import complete: ${data.detail}` });
      setShowImporter(false);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      setBanner({ type: 'error', text: err.message || 'CSV import failed.' });
    },
  });

  const handleToggle = (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    toggleMutation.mutate({ student: studentId, date: selectedDate, status: nextStatus });
  };

  const handleBulkMark = (statusToMark) => {
    if (!students.length) return;
    const records = students.map(s => ({ student: s.id, status: statusToMark }));
    bulkMutation.mutate({ date: selectedDate, records });
  };

  const executeCsvImport = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const required = ['first_name', 'last_name', 'parent_username', 'class_name'];
        if (!required.every(r => headers.includes(r))) throw new Error('Invalid CSV headers.');

        const [fiIdx, laIdx, puIdx, clIdx] = required.map(r => headers.indexOf(r));
        const studentsList = lines.slice(1).map(line => {
          const cells = line.split(',').map(c => c.trim());
          return {
            first_name: cells[fiIdx],
            last_name: cells[laIdx],
            parent_username: cells[puIdx],
            class_name: cells[clIdx],
          };
        }).filter(s => s.first_name);

        csvMutation.mutate({ students: studentsList });
      } catch (err) {
        setBanner({ type: 'error', text: err.message });
      }
    };
    reader.readAsText(csvFile);
  };

  const triggerDownloadTemplate = () => {
    const csv = "data:text/csv;charset=utf-8,first_name,last_name,parent_username,class_name\nBilly,Smith,billy_parent,Grade 5-A";
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'student_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presentCount = Object.values(attendanceMap).filter(r => r.status === 'PRESENT').length;
  const absentCount = Object.values(attendanceMap).filter(r => r.status === 'ABSENT').length;
  const unmarkedCount = students.length - (presentCount + absentCount);

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Classroom Attendance Tracker</h2>
          <p className="mt-1 text-sm text-slate-400">Welcome, <span className="text-indigo-400 font-semibold">{user?.username}</span></p>
        </div>
        {user?.role !== 'PARENT' && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button onClick={() => setShowImporter(!showImporter)} className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer">
              📂 Roster CSV Importer
            </button>
          </div>
        )}
      </div>

      {banner && (
        <div className={`rounded-2xl p-4 text-sm ${banner.type === 'error' ? 'bg-red-950/40 border border-red-500/20 text-red-400' : 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'}`}>
          {banner.text}
          <button onClick={() => setBanner(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {showImporter && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">Roster Import Console</h3>
            <button onClick={() => setShowImporter(false)} className="text-slate-400 text-xs">✕ Close</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <button onClick={triggerDownloadTemplate} className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-[10px] font-bold text-indigo-400">
                📥 Download Template
              </button>
            </div>
            <div className="flex flex-col bg-slate-950/40 p-4 rounded-xl space-y-3 border border-slate-800">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={e => setCsvFile(e.target.files[0])} className="block w-full text-xs text-slate-400" />
              {csvFile && (
                <button onClick={executeCsvImport} disabled={csvMutation.isPending} className="w-full py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl">
                  {csvMutation.isPending ? 'Processing...' : 'Import CSV'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
        {user?.role !== 'PARENT' ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Classroom</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
                <option value="Grade 5-A">Grade 5-A (Primary)</option>
                <option value="Grade 3-B">Grade 3-B (Secondary)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
          </div>
        )}
        <div className="flex items-center justify-around bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
          <div className="text-center"><span className="block text-xl font-bold text-emerald-400">{presentCount}</span><span className="text-[10px] uppercase text-slate-400">Present</span></div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="text-center"><span className="block text-xl font-bold text-rose-400">{absentCount}</span><span className="text-[10px] uppercase text-slate-400">Absent</span></div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="text-center"><span className="block text-xl font-bold text-slate-400">{unmarkedCount}</span><span className="text-[10px] uppercase text-slate-400">Unmarked</span></div>
        </div>
      </div>

      {user?.role !== 'PARENT' ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-t-2xl">
          <h3 className="font-bold text-sm text-white mb-2 sm:mb-0">Roster Mark Desk</h3>
          <div className="flex space-x-2">
            <button onClick={() => handleBulkMark('PRESENT')} disabled={loading || !students.length || bulkMutation.isPending} className="px-3.5 py-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50">Mark All Present</button>
            <button onClick={() => handleBulkMark('ABSENT')} disabled={loading || !students.length || bulkMutation.isPending} className="px-3.5 py-2 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50">Mark All Absent</button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-t-2xl">
          <h3 className="font-bold text-sm text-white">Daily Attendance Log</h3>
        </div>
      )}

      <div className="bg-slate-900/30 border border-t-0 border-slate-800 rounded-b-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-950/20">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Student Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Class</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Parent Contact</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/10">
              {loading && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-500 text-sm">Loading roster…</td></tr>
              )}
              {!loading && students.map((student) => {
                const record = attendanceMap[student.id];
                const currentStatus = record?.status;
                return (
                  <tr key={student.id} className="hover:bg-slate-900/20">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="h-9 w-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm mr-3">
                          {student.first_name[0]}{student.last_name[0]}
                        </span>
                        <div className="text-sm font-semibold text-white">{student.first_name} {student.last_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">{student.class_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300 font-medium">{student.parent_name}</div>
                      <div className="text-xs text-slate-500">{student.parent_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {user?.role === 'PARENT' ? (
                        currentStatus === 'PRESENT' ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Present</span>
                        ) : currentStatus === 'ABSENT' ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Absent</span>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-500 border border-slate-800">Unmarked</span>
                        )
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleToggle(student.id, currentStatus)} className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${currentStatus === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-emerald-500/20 hover:text-emerald-400'}`}>Present</button>
                          <button onClick={() => handleToggle(student.id, currentStatus)} className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${currentStatus === 'ABSENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-rose-500/20 hover:text-rose-400'}`}>Absent</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;
