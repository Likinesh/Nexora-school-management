import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const FeeLedger = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/invoices/', {
        params: user.role !== 'PARENT' && selectedStatus ? { status: selectedStatus } : {}
      });
      setInvoices(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch invoices from the financial API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedStatus]);

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  return (
    <div class="space-y-6">
      <div class="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-white sm:text-3xl">School Fee & Invoice Ledger</h2>
          <p class="mt-1 text-sm text-slate-400">
            {user.role === 'PARENT' ? "Account Statement" : "Administrator Financial Overview"}
          </p>
        </div>
      </div>

      {error && <div class="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>}

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span class="text-xs font-semibold text-slate-400 uppercase">Total Invoiced</span>
          <p class="mt-2 text-2xl font-bold text-white">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span class="text-xs font-semibold text-slate-400 uppercase text-emerald-400">Settled Balance</span>
          <p class="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(paidBalance)}</p>
        </div>
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span class="text-xs font-semibold text-slate-400 uppercase text-amber-400">Outstanding (Pending)</span>
          <p class="mt-2 text-2xl font-bold text-amber-400">{formatCurrency(pendingBalance)}</p>
        </div>
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span class="text-xs font-semibold text-slate-400 uppercase text-rose-400">Urgent (Overdue)</span>
          <p class="mt-2 text-2xl font-bold text-rose-400">{formatCurrency(overdueBalance)}</p>
        </div>
      </div>

      {user.role !== 'PARENT' && (
        <div class="flex items-center space-x-3 bg-slate-900/30 border border-slate-800 p-4 rounded-xl">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
          <div class="flex space-x-2">
            {['', 'PAID', 'PENDING', 'OVERDUE'].map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} class={`px-3 py-1 rounded-lg text-xs font-semibold border ${selectedStatus === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>{s ? s : 'ALL'}</button>
            ))}
          </div>
        </div>
      )}

      <div class="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-800">
            <thead class="bg-slate-900/60">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Student</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Class</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Invoice</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Amount</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Due Date</th>
                <th class="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-slate-950/20">
              {invoices.map((inv) => {
                const student = inv.student_detail;
                let badgeClass = "";
                switch(inv.status) {
                  case 'PAID': badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"; break;
                  case 'PENDING': badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20"; break;
                  case 'OVERDUE': badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold"; break;
                  default: badgeClass = "bg-slate-800 text-slate-400";
                }

                return (
                  <tr key={inv.id} class="hover:bg-slate-900/20">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="h-9 w-9 bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs mr-3 rounded-xl">{student?.first_name[0] || "S"}{student?.last_name[0] || "T"}</span>
                        <div class="text-sm font-semibold text-white">{student ? `${student.first_name} ${student.last_name}` : "Unknown"}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{student?.class_name || "N/A"}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{inv.title}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">{formatCurrency(inv.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{inv.due_date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center"><span class={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{inv.status}</span></td>
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

export default FeeLedger;
