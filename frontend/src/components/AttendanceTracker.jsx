import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedClass, setSelectedClass] = useState('Grade 5-A');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  
  const [showImporter, setShowImporter] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const rosterResponse = await apiClient.get('/api/students/', {
        params: { class_name: selectedClass }
      });
      const roster = rosterResponse.data;
      setStudents(roster);

      const attendanceResponse = await apiClient.get('/api/attendance/', {
        params: { date: selectedDate, class_name: selectedClass }
      });
      const attendanceList = attendanceResponse.data;

      const map = {};
      attendanceList.forEach(rec => {
        map[rec.student] = rec;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error(err);
      setErrorBanner("Failed to retrieve system parameters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedDate]);

  const handleToggleAttendance = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setErrorBanner(null);
    setSuccessBanner(null);

    const previousRecord = attendanceMap[studentId];
    const optimisticRecord = {
      ...(previousRecord || {}),
      student: studentId,
      date: selectedDate,
      status: nextStatus,
    };

    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: optimisticRecord
    }));

    try {
      const response = await apiClient.post('/api/attendance/', {
        student: studentId,
        date: selectedDate,
        status: nextStatus
      });
      setAttendanceMap(prev => ({
        ...prev,
        [studentId]: response.data
      }));
    } catch (err) {
      console.error(err);
      setAttendanceMap(prev => {
        const updated = { ...prev };
        if (previousRecord) {
          updated[studentId] = previousRecord;
        } else {
          delete updated[studentId];
        }
        return updated;
      });
      const studentName = students.find(s => s.id === studentId);
      const displayName = studentName ? `${studentName.first_name} ${studentName.last_name}` : "Student";
      setErrorBanner(`Sync Failed for ${displayName}.`);
    }
  };

  const handleBulkMark = async (statusToMark) => {
    if (students.length === 0) return;
    setErrorBanner(null);
    setSuccessBanner(null);

    const snapshotBackup = { ...attendanceMap };
    const optimisticMap = { ...attendanceMap };
    const bulkRecords = [];

    students.forEach(student => {
      optimisticMap[student.id] = {
        ...(attendanceMap[student.id] || {}),
        student: student.id,
        date: selectedDate,
        status: statusToMark
      };
      bulkRecords.push({ student: student.id, status: statusToMark });
    });

    setAttendanceMap(optimisticMap);

    try {
      const response = await apiClient.post('/api/attendance/bulk/', {
        date: selectedDate,
        records: bulkRecords
      });
      const freshMap = { ...attendanceMap };
      response.data.forEach(rec => {
        freshMap[rec.student] = rec;
      });
      setAttendanceMap(freshMap);
      setSuccessBanner(`Successfully marked ${students.length} students as ${statusToMark}!`);
    } catch (err) {
      console.error(err);
      setAttendanceMap(snapshotBackup);
      setErrorBanner(`Sync Failed: Bulk updates rolled back.`);
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (file) setCsvFile(file);
  };

  const executeCsvImport = () => {
    if (!csvFile) return;
    setImporting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const requiredHeaders = ['first_name', 'last_name', 'parent_username', 'class_name'];
        const headersValid = requiredHeaders.every(req => headers.includes(req));

        if (!headersValid) {
          throw new Error("Invalid CSV format headers.");
        }

        const firstNameIdx = headers.indexOf('first_name');
        const lastNameIdx = headers.indexOf('last_name');
        const parentUserIdx = headers.indexOf('parent_username');
        const classIdx = headers.indexOf('class_name');

        const studentsList = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.trim());
          if (cells.length < requiredHeaders.length) continue;
          studentsList.push({
            first_name: cells[firstNameIdx],
            last_name: cells[lastNameIdx],
            parent_username: cells[parentUserIdx],
            class_name: cells[classIdx]
          });
        }

        const response = await apiClient.post('/api/students/bulk/', { students: studentsList });
        setSuccessBanner(`Import Complete: ${response.data.detail}`);
        setShowImporter(false);
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadData();
      } catch (err) {
        console.error(err);
        setErrorBanner(err.message || "CSV upload failed.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(csvFile);
  };

  const triggerDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,first_name,last_name,parent_username,class_name\nBilly,Smith,billy_parent,Grade 5-A";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalStudents = students.length;
  const presentCount = Object.values(attendanceMap).filter(r => r.status === 'PRESENT').length;
  const absentCount = Object.values(attendanceMap).filter(r => r.status === 'ABSENT').length;
  const unmarkedCount = totalStudents - (presentCount + absentCount);

  return (
    <div class="space-y-6">
      <div class="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-white sm:text-3xl">Classroom Attendance Tracker</h2>
          <p class="mt-1 text-sm text-slate-400">Welcome, <span class="text-indigo-400 font-semibold">{user?.username}</span></p>
        </div>
        {user?.role !== 'PARENT' && (
          <div class="mt-4 md:mt-0 flex space-x-2">
            <button onClick={() => setShowImporter(!showImporter)} class="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer">
              📂 Roster CSV Importer
            </button>
          </div>
        )}
      </div>

      {errorBanner && <div class="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400">{errorBanner}</div>}
      {successBanner && <div class="rounded-2xl bg-emerald-950/40 border border-emerald-500/20 p-4 text-sm text-emerald-400">{successBanner}</div>}

      {showImporter && (
        <div class="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-white text-sm">Roster Import Console</h3>
            <button onClick={() => setShowImporter(false)} class="text-slate-400 text-xs">✕ Close</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <button onClick={triggerDownloadTemplate} class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-[10px] font-bold text-indigo-400">
                📥 Download Template
              </button>
            </div>
            <div class="flex flex-col bg-slate-950/40 p-4 rounded-xl space-y-3 border border-slate-850">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} class="block w-full text-xs text-slate-400" />
              {csvFile && <button onClick={executeCsvImport} disabled={importing} class="w-full py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl">{importing ? "Processing..." : "Import CSV"}</button>}
            </div>
          </div>
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Classroom</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
            <option value="Grade 5-A">Grade 5-A (Primary)</option>
            <option value="Grade 3-B">Grade 3-B (Secondary)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
        </div>
        <div class="flex items-center justify-around bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
          <div class="text-center"><span class="block text-xl font-bold text-emerald-400">{presentCount}</span><span class="text-[10px] uppercase text-slate-450">Present</span></div>
          <div class="h-8 w-px bg-slate-850"></div>
          <div class="text-center"><span class="block text-xl font-bold text-rose-400">{absentCount}</span><span class="text-[10px] uppercase text-slate-455">Absent</span></div>
          <div class="h-8 w-px bg-slate-850"></div>
          <div class="text-center"><span class="block text-xl font-bold text-slate-400">{unmarkedCount}</span><span class="text-[10px] uppercase text-slate-460">Unmarked</span></div>
        </div>
      </div>

      {user?.role !== 'PARENT' ? (
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-t-2xl">
          <h3 class="font-bold text-sm text-white mb-2 sm:mb-0">Roster Marks deck</h3>
          <div class="flex space-x-2">
            <button onClick={() => handleBulkMark('PRESENT')} disabled={loading || students.length === 0} class="px-3.5 py-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer">Mark All Present</button>
            <button onClick={() => handleBulkMark('ABSENT')} disabled={loading || students.length === 0} class="px-3.5 py-2 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold cursor-pointer">Mark All Absent</button>
          </div>
        </div>
      ) : (
        <div class="bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-t-2xl">
          <h3 class="font-bold text-sm text-white">Daily Attendance Log</h3>
        </div>
      )}

      <div class="bg-slate-900/30 border border-t-0 border-slate-800 rounded-b-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-800">
            <thead class="bg-slate-950/20">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Student Name</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Class</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Parent Contact</th>
                <th class="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Attendance Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-slate-950/10">
              {students.map((student) => {
                const record = attendanceMap[student.id];
                const status = record?.status;

                return (
                  <tr key={student.id} class="hover:bg-slate-900/20">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="h-9 w-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm mr-3">
                          {student.first_name[0]}{student.last_name[0]}
                        </span>
                        <div class="text-sm font-semibold text-white">{student.first_name} {student.last_name}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-750">{student.class_name}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-slate-300 font-medium">{student.parent_name}</div>
                      <div class="text-xs text-slate-500">{student.parent_email}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      {user?.role === 'PARENT' ? (
                        status === 'PRESENT' ? (
                          <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Present</span>
                        ) : status === 'ABSENT' ? (
                          <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Absent</span>
                        ) : (
                          <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-500 border border-slate-800">Unmarked</span>
                        )
                      ) : (
                        <div class="flex items-center justify-center space-x-2">
                          <button onClick={() => handleToggleAttendance(student.id, status)} class={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md ${status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>Present</button>
                          <button onClick={() => handleToggleAttendance(student.id, status)} class={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md ${status === 'ABSENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>Absent</button>
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
