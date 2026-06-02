import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> attendanceRecord
  const [selectedClass, setSelectedClass] = useState('Grade 5-A');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Fetch student roster and their daily attendance logs
  const loadData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      // 1. Fetch classroom roster
      const rosterResponse = await apiClient.get('/api/students/', {
        params: { class_name: selectedClass }
      });
      const roster = rosterResponse.data;
      setStudents(roster);

      // 2. Fetch daily attendance records
      const attendanceResponse = await apiClient.get('/api/attendance/', {
        params: { date: selectedDate, class_name: selectedClass }
      });
      const attendanceList = attendanceResponse.data;

      // Map student IDs to their attendance record
      const map = {};
      attendanceList.forEach(rec => {
        // rec.student is the ID from the shallow serialization path
        map[rec.student] = rec;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error("Failed to load attendance parameters:", err);
      setErrorBanner("Failed to retrieve data from server. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedDate]);

  /**
   * Optimistic UI Toggle Handler
   * 
   * Interview Defense:
   * - Toggles state instantly in React memory BEFORE firing network dispatch, 
   *   delivering a zero-latency modern experience.
   * - Preserves a transaction rollback snapshot of the previous state.
   * - Performs an automatic rollback transaction if the backend fails, returning 
   *   the toggle to its original position and alerting the user.
   */
  const handleToggleAttendance = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setErrorBanner(null);

    // 1. Snapshot previous record state for rollback transactions
    const previousRecord = attendanceMap[studentId];

    // 2. Optimistically update local React UI state immediately
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

    // 3. Fire API dispatch in background
    try {
      const response = await apiClient.post('/api/attendance/', {
        student: studentId,
        date: selectedDate,
        status: nextStatus
      });

      // Synchronize database representation (e.g. database PK IDs)
      setAttendanceMap(prev => ({
        ...prev,
        [studentId]: response.data
      }));
    } catch (err) {
      console.error("Downstream API transaction failed, rolling back UI...", err);
      
      // 4. ROLLBACK TRANSACTION: Revert UI to the snapshot
      setAttendanceMap(prev => {
        const updated = { ...prev };
        if (previousRecord) {
          updated[studentId] = previousRecord;
        } else {
          delete updated[studentId];
        }
        return updated;
      });

      // 5. Fire critical failure alert banner
      const studentName = students.find(s => s.id === studentId);
      const displayName = studentName ? `${studentName.first_name} ${studentName.last_name}` : "Student";
      
      setErrorBanner(
        `Sync Failed: Could not mark ${displayName} as ${nextStatus}. Connection was lost, changes rolled back.`
      );
    }
  };

  // Helper counters
  const totalStudents = students.length;
  const presentCount = Object.values(attendanceMap).filter(r => r.status === 'PRESENT').length;
  const absentCount = Object.values(attendanceMap).filter(r => r.status === 'ABSENT').length;
  const unmarkedCount = totalStudents - (presentCount + absentCount);

  return (
    <div class="space-y-6">
      {/* Upper Title Panel */}
      <div class="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Classroom Attendance Tracker
          </h2>
          <p class="mt-1 text-sm text-slate-400">
            Welcome, <span class="text-indigo-400 font-medium">{user?.username}</span> (Role: {user?.role})
          </p>
        </div>
      </div>

      {/* Critical Rollback Sync Warning Banner */}
      {errorBanner && (
        <div class="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 shadow-lg shadow-red-950/5 animate-pulse">
          <div class="flex items-center">
            <span class="mr-3 text-xl">⚠️</span>
            <span class="font-medium">{errorBanner}</span>
          </div>
        </div>
      )}

      {/* Roster Selection Filters */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 p-4 rounded-2xl">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Classroom</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="Grade 5-A">Grade 5-A (Primary)</option>
            <option value="Grade 3-B">Grade 3-B (Secondary)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        <div class="flex items-center justify-around bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
          <div class="text-center">
            <span class="block text-xl font-bold text-emerald-400">{presentCount}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Present</span>
          </div>
          <div class="h-8 w-px bg-slate-800"></div>
          <div class="text-center">
            <span class="block text-xl font-bold text-rose-400">{absentCount}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Absent</span>
          </div>
          <div class="h-8 w-px bg-slate-800"></div>
          <div class="text-center">
            <span class="block text-xl font-bold text-slate-400">{unmarkedCount}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Unmarked</span>
          </div>
        </div>
      </div>

      {/* Roster Table Content */}
      <div class="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
        {loading ? (
          <div class="p-12 text-center text-slate-400">
            <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading student roster parameters...
          </div>
        ) : students.length === 0 ? (
          <div class="p-12 text-center text-slate-400">
            <span class="text-3xl block mb-2">🤷‍♂️</span>
            No students found registered under {selectedClass}.
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-800">
              <thead class="bg-slate-900/60">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Name</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Class</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent Contact</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 bg-slate-950/20">
                {students.map((student) => {
                  const record = attendanceMap[student.id];
                  const status = record?.status; // PRESENT, ABSENT, or undefined

                  return (
                    <tr key={student.id} class="hover:bg-slate-900/20 transition duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <span class="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm mr-3">
                            {student.first_name[0]}{student.last_name[0]}
                          </span>
                          <div class="text-sm font-semibold text-white">
                            {student.first_name} {student.last_name}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                          {student.class_name}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-slate-300 font-medium">{student.parent_name}</div>
                        <div class="text-xs text-slate-500">{student.parent_email}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleToggleAttendance(student.id, status)}
                            class={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide shadow-md transition duration-150 cursor-pointer ${
                              status === 'PRESENT'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleToggleAttendance(student.id, status)}
                            class={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide shadow-md transition duration-150 cursor-pointer ${
                              status === 'ABSENT'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;
