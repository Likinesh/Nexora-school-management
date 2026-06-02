import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const FeeLedger = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(''); // status filter for Admins

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/invoices/', {
        params: user.role !== 'PARENT' && selectedStatus ? { status: selectedStatus } : {}
      });
      setInvoices(response.data);
    } catch (err) {
      console.error("Failed to load fee ledger logs:", err);
      setError("Failed to fetch invoices from the financial API. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedStatus]);

  // Dynamic balance parameters calculated directly from state to avoid stale caches
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidBalance = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingBalance = invoices
    .filter(inv => inv.status === 'PENDING')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const overdueBalance = invoices
    .filter(inv => inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Helper formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  return (
    <div class="space-y-6">
      {/* Header Block */}
      <div class="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            School Fee & Invoice Ledger
          </h2>
          <p class="mt-1 text-sm text-slate-400">
            {user.role === 'PARENT' 
              ? `Account Statement for parent John Smith (Dynamic Isolation: ON)` 
              : `Administrator Financial Overview (All Student Ledgers)`}
          </p>
        </div>
      </div>

      {error && (
        <div class="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 shadow-md">
          <div class="flex">
            <span class="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Dynamic Aggregate Cards */}
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Card */}
        <div class="bg-slate-900/40 backdrop-blur-sm overflow-hidden border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <span class="text-xl">📊</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-white">{formatCurrency(totalInvoiced)}</p>
          <div class="mt-1 flex items-center text-xs text-slate-500">
            <span>Aggregated balance logs</span>
          </div>
        </div>

        {/* Paid Card */}
        <div class="bg-slate-900/40 backdrop-blur-sm overflow-hidden border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settled Balance</span>
            <span class="text-xl text-emerald-400">✓</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(paidBalance)}</p>
          <div class="mt-1 flex items-center text-xs text-emerald-500 font-medium">
            <span>Successfully cleared fees</span>
          </div>
        </div>

        {/* Pending Card */}
        <div class="bg-slate-900/40 backdrop-blur-sm overflow-hidden border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding (Pending)</span>
            <span class="text-xl text-amber-400">⏳</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-amber-400">{formatCurrency(pendingBalance)}</p>
          <div class="mt-1 flex items-center text-xs text-amber-500 font-medium">
            <span>Awaiting standard processing</span>
          </div>
        </div>

        {/* Overdue Card */}
        <div class="bg-slate-900/40 backdrop-blur-sm overflow-hidden border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Urgent (Overdue)</span>
            <span class="text-xl text-rose-400">🚨</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-rose-400">{formatCurrency(overdueBalance)}</p>
          <div class="mt-1 flex items-center text-xs text-rose-500 font-medium">
            <span>Requires immediate payment</span>
          </div>
        </div>
      </div>

      {/* Admin-only Filter Panel */}
      {user.role !== 'PARENT' && (
        <div class="flex items-center space-x-3 bg-slate-900/30 border border-slate-800 p-4 rounded-xl">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
          <div class="flex space-x-2">
            {['', 'PAID', 'PENDING', 'OVERDUE'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                class={`px-3 py-1 rounded-lg text-xs font-semibold border transition duration-150 cursor-pointer ${
                  selectedStatus === s
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s ? s : 'ALL'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div class="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
        {loading ? (
          <div class="p-12 text-center text-slate-400">
            <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Fetching balance ledger statement...
          </div>
        ) : invoices.length === 0 ? (
          <div class="p-12 text-center text-slate-400">
            <span class="text-3xl block mb-2">💵</span>
            No fee invoices found under this account.
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-800">
              <thead class="bg-slate-900/60">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Profile</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Classroom</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice Title</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 bg-slate-950/20">
                {invoices.map((inv) => {
                  const student = inv.student_detail;
                  
                  // Map status to aesthetic Tailwind CSS v4 color pills
                  let badgeClass = "";
                  switch(inv.status) {
                    case 'PAID':
                      badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      break;
                    case 'PENDING':
                      badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse";
                      break;
                    case 'OVERDUE':
                      badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold animate-bounce";
                      break;
                    default:
                      badgeClass = "bg-slate-800 text-slate-400";
                  }

                  return (
                    <tr key={inv.id} class="hover:bg-slate-900/20 transition duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <span class="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs mr-3">
                            {student?.first_name[0] || "S"}{student?.last_name[0] || "T"}
                          </span>
                          <div class="text-sm font-semibold text-white">
                            {student ? `${student.first_name} ${student.last_name}` : "Unknown Student"}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                        {student?.class_name || "N/A"}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {inv.title}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                        {inv.due_date}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                          {inv.status}
                        </span>
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

export default FeeLedger;
