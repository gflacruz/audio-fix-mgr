import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getReports } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const fmt = (val) => `$${val.toFixed(2)}`;

const Reports = () => {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [totals, setTotals] = useState({ repairCount: 0, labor: 0, parts: 0, tax: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getReports(year);
        setAvailableYears(data.availableYears || []);
        setQuarters(data.quarters || []);
        setTotals(data.totals || { repairCount: 0, labor: 0, parts: 0, tax: 0, revenue: 0 });
        if (!year && data.year) setYear(data.year);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-amber-500" size={28} />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Reports</h1>
          </div>

          <select
            value={year || ''}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold font-mono text-amber-500">{fmt(totals.revenue)}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Tax Collected</p>
                <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{fmt(totals.tax)}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Repairs</p>
                <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{totals.repairCount}</p>
              </div>
            </div>

            {/* Quarterly Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                    <th className="px-6 py-4 font-medium">Quarter</th>
                    <th className="px-6 py-4 font-medium">Repairs</th>
                    <th className="px-6 py-4 font-medium">Labor</th>
                    <th className="px-6 py-4 font-medium">Parts</th>
                    <th className="px-6 py-4 font-medium">Tax</th>
                    <th className="px-6 py-4 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-900 dark:text-zinc-100">
                  {quarters.map((q) => (
                    <tr key={q.quarter} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4 font-medium">Q{q.quarter}</td>
                      <td className="px-6 py-4 font-mono">{q.repairCount}</td>
                      <td className="px-6 py-4 font-mono">{fmt(q.labor)}</td>
                      <td className="px-6 py-4 font-mono">{fmt(q.parts)}</td>
                      <td className="px-6 py-4 font-mono">{fmt(q.tax)}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-amber-500">{fmt(q.revenue)}</td>
                    </tr>
                  ))}
                  {quarters.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No closed repairs found for {year}.</td>
                    </tr>
                  )}
                </tbody>
                {quarters.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-800/50">
                      <td className="px-6 py-4">Total</td>
                      <td className="px-6 py-4 font-mono">{totals.repairCount}</td>
                      <td className="px-6 py-4 font-mono">{fmt(totals.labor)}</td>
                      <td className="px-6 py-4 font-mono">{fmt(totals.parts)}</td>
                      <td className="px-6 py-4 font-mono">{fmt(totals.tax)}</td>
                      <td className="px-6 py-4 font-mono text-amber-500">{fmt(totals.revenue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
