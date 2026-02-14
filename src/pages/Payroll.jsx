import React, { useEffect, useState, useMemo } from 'react';
import Modal from '@/components/Modal';
import { getPayroll, processPayout } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DollarSign, CheckCircle2, AlertCircle, Calendar, History } from 'lucide-react';

const Payroll = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPayroll();
      setRepairs(data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to load payroll:", error);
    }
    setLoading(false);
  };

  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectTechnician = (techName, techRepairs) => {
    const newSelected = new Set(selectedIds);
    const allSelected = techRepairs.every(r => selectedIds.has(r.id));

    if (allSelected) {
      techRepairs.forEach(r => newSelected.delete(r.id));
    } else {
      techRepairs.forEach(r => newSelected.add(r.id));
    }
    setSelectedIds(newSelected);
  };

  const handlePayout = () => {
    if (selectedIds.size === 0) return;
    setPayoutAmount('');
    setShowPayoutModal(true);
  };

  const breakdown = useMemo(() => {
    const selected = repairs.filter(r => selectedIds.has(r.id));
    return {
      count: selected.length,
      labor: selected.reduce((sum, r) => sum + r.laborCost, 0),
      parts: selected.reduce((sum, r) => sum + r.partsCost, 0),
      tax: selected.reduce((sum, r) => sum + (r.tax || 0), 0),
      deposit: selected.reduce((sum, r) => sum + r.diagnosticFee, 0),
      total: selected.reduce((sum, r) => sum + r.totalCost, 0),
    };
  }, [repairs, selectedIds]);

  const executePayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    setProcessing(true);
    try {
      await processPayout(Array.from(selectedIds), amount);
      await loadData();
      setShowPayoutModal(false);
      setPayoutAmount('');
    } catch (error) {
      console.error("Payout failed:", error);
      alert('Failed to process payout.');
    }
    setProcessing(false);
  };

  // Group by Technician
  const grouped = repairs.reduce((acc, curr) => {
    const tech = curr.technician || 'Unassigned';
    if (!acc[tech]) acc[tech] = [];
    acc[tech].push(curr);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-zinc-500">Loading payroll data...</div>;

  const parsedAmount = parseFloat(payoutAmount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <DollarSign className="text-emerald-600 dark:text-emerald-500" size={32} />
            Technician Payroll
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review and process payouts for closed tickets.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/payroll/history')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors mr-4"
          >
            <History size={20} />
            History
          </button>

          {selectedIds.size > 0 && (
            <div className="text-right mr-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{selectedIds.size} selected</div>
            </div>
          )}
          <button
            onClick={handlePayout}
            disabled={selectedIds.size === 0 || processing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
          >
            {processing ? 'Processing...' : 'Mark as Paid'}
            <CheckCircle2 size={20} />
          </button>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-sm dark:shadow-none">
          <CheckCircle2 size={48} className="mx-auto text-zinc-400 dark:text-zinc-700 mb-4" />
          <h3 className="text-xl text-zinc-900 dark:text-zinc-300 font-medium">All Caught Up!</h3>
          <p className="text-zinc-500 mt-2">No unpaid closed repairs found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([tech, techRepairs]) => {
            const allSelected = techRepairs.every(r => selectedIds.has(r.id));

            return (
              <div key={tech} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{tech}</h2>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded text-sm">
                      {techRepairs.length} tickets
                    </span>
                  </div>
                  <button
                    onClick={() => handleSelectTechnician(tech, techRepairs)}
                    className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 font-medium uppercase tracking-wider"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-6 py-3 w-12"></th>
                        <th className="px-6 py-3">Claim #</th>
                        <th className="px-6 py-3">Date Closed</th>
                        <th className="px-6 py-3">Unit</th>
                        <th className="px-6 py-3 text-right">Labor</th>
                        <th className="px-6 py-3 text-right">Parts</th>
                        <th className="px-6 py-3 text-right">Tax</th>
                        <th className="px-6 py-3 text-right">Deposit</th>
                        <th className="px-6 py-3 text-right">Total Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                      {techRepairs.map(repair => (
                        <tr
                          key={repair.id}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${selectedIds.has(repair.id) ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                          onClick={() => handleSelect(repair.id)}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(repair.id)}
                              onChange={() => handleSelect(repair.id)}
                              className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-mono">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/repair/${repair.id}`);
                              }}
                              className="hover:text-amber-600 dark:hover:text-amber-500 hover:underline"
                            >
                              #{repair.claimNumber}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{new Date(repair.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-zinc-900 dark:text-white font-medium">{repair.brand} {repair.model}</td>
                          <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">${repair.laborCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">${repair.partsCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">${(repair.tax || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">${repair.diagnosticFee.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-200 font-bold">${repair.totalCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Process Payout"
        footer={
          <>
            <button
              onClick={() => setShowPayoutModal(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={executePayout}
              disabled={processing || !isAmountValid}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-emerald-500 mb-4">
            <CheckCircle2 size={32} />
            <h4 className="text-xl font-bold">{breakdown.count} repairs selected</h4>
          </div>

          <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-zinc-400">Total Labor</span>
              <span className="text-zinc-200 font-mono">${breakdown.labor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-zinc-400">Total Parts</span>
              <span className="text-zinc-200 font-mono">${breakdown.parts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-zinc-400">Total Tax</span>
              <span className="text-zinc-200 font-mono">${breakdown.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-zinc-400">Total Deposit</span>
              <span className="text-zinc-200 font-mono">${breakdown.deposit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-zinc-900/50">
              <span className="text-white font-bold">Grand Total</span>
              <span className="text-white font-mono font-bold">${breakdown.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-zinc-400 mb-2">Payout Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-lg">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-950 border border-zinc-700 text-white pl-8 pr-4 py-2.5 rounded-lg focus:border-emerald-500 outline-none font-mono text-lg"
                autoFocus
              />
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Enter the total amount to pay out. This will be recorded against the selected repairs.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
