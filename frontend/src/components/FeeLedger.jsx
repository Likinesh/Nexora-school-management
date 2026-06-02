import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const fetchInvoices = (role, selectedStatus) =>
  apiClient.get('/api/invoices/', {
    params: role !== 'PARENT' && selectedStatus ? { status: selectedStatus } : {}
  }).then(r => r.data);

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const STATUS_BADGE = {
  PAID:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PENDING: 'bg-slate-800 text-slate-400 border border-slate-700',
  OVERDUE: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold',
};

const FeeLedger = () => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', selectedStatus, user?.role],
    queryFn: () => fetchInvoices(user?.role, selectedStatus),
  });

  const totalInvoiced  = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidBalance    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.amount), 0);
  const pendingBalance = invoices.filter(i => ['PENDING', 'PARTIAL'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0);
  const overdueBalance = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">School Fee &amp; Invoice Ledger</h2>
          <p className="mt-1 text-sm text-slate-400">
            {user.role === 'PARENT' ? 'Account Statement' : 'Administrator Financial Overview'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400">
          Failed to fetch invoices from the financial API.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Invoiced', value: totalInvoiced, color: 'text-white' },
          { label: 'Settled (Paid)', value: paidBalance, color: 'text-emerald-400' },
          { label: 'Outstanding', value: pendingBalance, color: 'text-amber-400' },
          { label: 'Urgent (Overdue)', value: overdueBalance, color: 'text-rose-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {user.role !== 'PARENT' && (
        <div className="flex items-center space-x-3 bg-slate-900/30 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
          <div className="flex space-x-2 flex-wrap gap-y-2">
            {['', 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE'].map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedStatus === s
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s || 'ALL'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Class</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Settled</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Due Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/20">
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">Loading ledger…</td></tr>
              )}
              {!isLoading && invoices.map(inv => {
                const student = inv.student_detail;
                const badgeClass = STATUS_BADGE[inv.status] || 'bg-slate-800 text-slate-400';
                const isExpanded = expandedInvoice === inv.id;
                const hasAttempts = inv.payment_attempts && inv.payment_attempts.length > 0;

                return (
                  <React.Fragment key={inv.id}>
                    <tr
                      className={`hover:bg-slate-900/20 ${hasAttempts ? 'cursor-pointer' : ''}`}
                      onClick={() => hasAttempts && setExpandedInvoice(isExpanded ? null : inv.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="h-9 w-9 bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs mr-3 rounded-xl">
                            {student?.first_name?.[0] || 'S'}{student?.last_name?.[0] || 'T'}
                          </span>
                          <div className="text-sm font-semibold text-white">
                            {student ? `${student.first_name} ${student.last_name}` : 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{student?.class_name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {inv.title}
                        {hasAttempts && <span className="ml-2 text-[10px] text-indigo-400">{isExpanded ? '▲' : '▼'} history</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">{formatCurrency(inv.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-semibold">{formatCurrency(inv.amount_settled || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{inv.due_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{inv.status}</span>
                      </td>
                    </tr>
                    {isExpanded && hasAttempts && (
                      <tr>
                        <td colSpan={7} className="bg-slate-950/40 px-10 py-4">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Payment History</p>
                          <div className="space-y-2">
                            {inv.payment_attempts.map(attempt => (
                              <div key={attempt.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                                <span className="text-white font-semibold">{formatCurrency(attempt.amount_paid)}</span>
                                <span className="text-slate-400">{new Date(attempt.transaction_date).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold ${
                                  attempt.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                                  attempt.status === 'FAILED'  ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-slate-800 text-slate-400'
                                }`}>{attempt.status}</span>
                                {attempt.notes && <span className="text-slate-500 italic max-w-xs truncate">{attempt.notes}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
