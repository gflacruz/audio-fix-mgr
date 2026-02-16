import React, { useEffect, useState, useMemo } from 'react';
import { getPayrollHistory, getTechnicians } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { History, Calendar, Filter, ArrowLeft, ChevronRight } from 'lucide-react';

const PayrollHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [expandedBatches, setExpandedBatches] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    technician: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const techs = await getTechnicians();
        setTechnicians(techs);

        // Set default dates (current month)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        setFilters(prev => ({
          ...prev,
          startDate: firstDay,
          endDate: lastDay
        }));
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadData();
    }
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPayrollHistory(filters);
      setRepairs(data);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
    setLoading(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Group repairs by payout batch (or fallback key for legacy records)
  const batches = useMemo(() => {
    const groups = {};
    repairs.forEach(repair => {
      const key = repair.payoutBatchId || `legacy_${new Date(repair.paidOutDate).toISOString().split('T')[0]}_${repair.technician}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          technician: repair.technician,
          paidOutDate: repair.paidOutDate,
          repairs: [],
          totalPayout: 0,
        };
      }
      groups[key].repairs.push(repair);
      groups[key].totalPayout += repair.payoutAmount || 0;
    });

    return Object.values(groups).sort((a, b) => new Date(b.paidOutDate) - new Date(a.paidOutDate));
  }, [repairs]);

  const totalPaid = repairs.reduce((sum, r) => sum + (r.payoutAmount || 0), 0);

  const toggleBatch = (batchId) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <button
        onClick={() => navigate('/payroll')}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Payroll
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <History className="text-blue-600 dark:text-blue-500" size={32} />
            Payroll History
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">View past payouts.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-end shadow-sm dark:shadow-none">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">Technician</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-zinc-500" size={16} />
            <select
              name="technician"
              value={filters.technician}
              onChange={handleFilterChange}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:border-blue-500 outline-none appearance-none"
            >
              <option value="all">All Technicians</option>
              {technicians.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={16} />
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:border-blue-500 outline-none cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={16} />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              onClick={(e) => e.target.showPicker?.()}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:border-blue-500 outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
           <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Paid Out</span>
           <span className="text-xl font-mono font-bold text-zinc-900 dark:text-white">${totalPaid.toFixed(2)}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading history...</div>
      ) : batches.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center text-zinc-500 shadow-sm dark:shadow-none">
          No records found for the selected period.
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const isExpanded = expandedBatches[batch.id];
            return (
              <div key={batch.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                {/* Batch Header */}
                <button
                  onClick={() => toggleBatch(batch.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <ChevronRight
                      size={18}
                      className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-white">{batch.technician}</span>
                      <span className="text-zinc-400 mx-2">-</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                        {new Date(batch.paidOutDate).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                      {batch.repairs.length} {batch.repairs.length === 1 ? 'claim' : 'claims'}
                    </span>
                  </div>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ${batch.totalPayout.toFixed(2)}
                  </span>
                </button>

                {/* Expanded Detail Table */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-medium text-xs">
                          <tr>
                            <th className="px-6 py-2">Claim #</th>
                            <th className="px-6 py-2">Unit</th>
                            <th className="px-6 py-2 text-right">Labor</th>
                            <th className="px-6 py-2 text-right">Parts</th>
                            <th className="px-6 py-2 text-right">Tax</th>
                            <th className="px-6 py-2 text-right">Deposit</th>
                            <th className="px-6 py-2 text-right">Total</th>
                            <th className="px-6 py-2 text-right">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                          {batch.repairs.map(repair => (
                            <tr key={repair.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                              <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 font-mono">
                                <button
                                  onClick={() => navigate(`/repair/${repair.id}`)}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                                >
                                  #{repair.claimNumber}
                                </button>
                              </td>
                              <td className="px-6 py-3 text-zinc-700 dark:text-zinc-300">{repair.brand} {repair.model}</td>
                              <td className="px-6 py-3 text-right text-zinc-500">${repair.laborCost.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right text-zinc-500">${repair.partsCost.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right text-zinc-500">${(repair.tax || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-right text-zinc-500">${repair.diagnosticFee.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right text-zinc-600 dark:text-zinc-400">${repair.totalCost.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                ${(repair.payoutAmount || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PayrollHistory;
