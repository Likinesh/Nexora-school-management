import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  
  // Modals & form loading states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Forms state
  const [invoiceForm, setInvoiceForm] = useState({
    student: '',
    title: '',
    amount: '',
    due_date: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    notes: ''
  });

  // Query Invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', selectedStatus, user?.role],
    queryFn: () => fetchInvoices(user?.role, selectedStatus),
  });

  // Query Students (For Admin Invoice Form)
  const { data: students = [] } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => apiClient.get('/api/students/').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  });

  const totalInvoiced  = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidBalance    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.amount), 0);
  const pendingBalance = invoices.filter(i => ['PENDING', 'PARTIAL'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0);
  const overdueBalance = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + Number(i.amount), 0);

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/api/invoices/create/', {
        student: parseInt(invoiceForm.student),
        title: invoiceForm.title,
        amount: parseFloat(invoiceForm.amount),
        due_date: invoiceForm.due_date
      });
      
      // Reset & Close
      setInvoiceForm({ student: '', title: '', amount: '', due_date: '' });
      setShowInvoiceModal(false);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create invoice.');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/api/payments/', {
        invoice: selectedInvoiceForPayment.id,
        amount_paid: parseFloat(paymentForm.amount_paid),
        notes: paymentForm.notes
      });
      
      // Reset & Close
      setPaymentForm({ amount_paid: '', notes: '' });
      setShowPaymentModal(false);
      setSelectedInvoiceForPayment(null);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">School Fee &amp; Invoice Ledger</h2>
          <p className="mt-1 text-sm text-slate-400">
            {user.role === 'PARENT' ? 'Account Statement' : 'Administrator Financial Overview'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-violet-500/10 transition-all"
            >
              ➕ Create Invoice
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400">
          Failed to fetch invoices from the financial API.
        </div>
      )}

      {/* Metrics widgets */}
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

      {/* Invoice Table */}
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
                      className="hover:bg-slate-900/20 cursor-pointer"
                      onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium font-sans">
                        {inv.title}
                        <span className="ml-2 text-[10px] text-indigo-400 font-mono">({isExpanded ? '▲ hide details' : '▼ show details'})</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">{formatCurrency(inv.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-semibold">{formatCurrency(inv.amount_settled || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{inv.due_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{inv.status}</span>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="bg-slate-950/40 px-10 py-5">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Attempts &amp; History</p>
                            {user?.role === 'ADMIN' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setShowPaymentModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all shadow-md shadow-violet-500/10"
                              >
                                ➕ Record Payment
                              </button>
                            )}
                          </div>

                          {!hasAttempts ? (
                            <p className="text-xs text-slate-500 italic py-2">No payment attempts logged for this invoice.</p>
                          ) : (
                            <div className="space-y-2">
                              {inv.payment_attempts.map(attempt => (
                                <div key={attempt.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
                                  <span className="text-white font-bold">{formatCurrency(attempt.amount_paid)}</span>
                                  <span className="text-slate-400">{new Date(attempt.transaction_date).toLocaleDateString()}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    attempt.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                                    attempt.status === 'FAILED'  ? 'bg-rose-500/10 text-rose-400' :
                                    'bg-slate-800 text-slate-400'
                                  }`}>{attempt.status}</span>
                                  {attempt.notes ? (
                                    <span className="text-slate-400 bg-slate-950 px-3 py-1 rounded-lg italic max-w-xs truncate border border-slate-850">{attempt.notes}</span>
                                  ) : (
                                    <span className="text-slate-600 italic">No notes</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
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

      {/* CREATE INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
            <h3 className="text-lg font-bold text-white">Create New Invoice</h3>
            
            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Student</label>
                <select
                  required
                  value={invoiceForm.student}
                  onChange={e => setInvoiceForm({ ...invoiceForm, student: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.class_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Invoice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuition Fee - Q3"
                  value={invoiceForm.title}
                  onChange={e => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="500.00"
                  value={invoiceForm.amount}
                  onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                <input
                  type="date"
                  required
                  value={invoiceForm.due_date}
                  onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-3 border border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs rounded-xl cursor-pointer hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
            <h3 className="text-lg font-bold text-white">Record Fee Payment</h3>
            <p className="text-xs text-slate-400">
              Logging transaction for invoice: <span className="text-white font-semibold">{selectedInvoiceForPayment.title}</span>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount Paid (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="250.00"
                  value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transaction Notes</label>
                <textarea
                  placeholder="Optional transaction reference, check ID, etc."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoiceForPayment(null);
                  }}
                  className="flex-1 py-3 border border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs rounded-xl cursor-pointer hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  {formLoading ? 'Logging...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeLedger;
