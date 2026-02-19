import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Modal from '@/components/Modal';
import { getUnpaidRepairsForTech, processPayout, getTechnicians } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DollarSign, CheckCircle2, Plus, Search, X, History } from 'lucide-react';

const Payroll = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core state — restore from sessionStorage if available
  const draft = useRef(null);
  try { draft.current = JSON.parse(sessionStorage.getItem('payroll_draft')); } catch {}
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState(draft.current?.selectedTech || '');
  const [claims, setClaims] = useState(draft.current?.claims || []);
  const [loading, setLoading] = useState(true);

  // Claim search
  const [showClaimSearch, setShowClaimSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Submission
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const techs = await getTechnicians();
        setTechnicians(techs);

        // If restoring a draft, re-fetch claims to get fresh data
        if (draft.current?.selectedTech && draft.current?.claims?.length > 0) {
          try {
            const freshRepairs = await getUnpaidRepairsForTech(draft.current.selectedTech);
            const freshMap = new Map(freshRepairs.map(r => [r.id, r]));
            const refreshed = draft.current.claims
              .filter(c => freshMap.has(c.id))  // drop claims that were paid out or reassigned
              .map(c => ({ ...freshMap.get(c.id), payAmount: c.payAmount })); // fresh data + saved payAmount
            setClaims(refreshed);
            if (refreshed.length === 0) {
              setSelectedTech('');
              sessionStorage.removeItem('payroll_draft');
            }
          } catch (error) {
            console.error("Failed to refresh draft claims:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load technicians:", error);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Persist draft state to sessionStorage
  useEffect(() => {
    if (selectedTech || claims.length > 0) {
      sessionStorage.setItem('payroll_draft', JSON.stringify({ selectedTech, claims }));
    } else {
      sessionStorage.removeItem('payroll_draft');
    }
  }, [selectedTech, claims]);

  // Search when query or tech changes
  const doSearch = useCallback(async (tech, query) => {
    if (!tech) return;
    setSearchLoading(true);
    try {
      const results = await getUnpaidRepairsForTech(tech, query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (!showClaimSearch || !selectedTech) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(selectedTech, searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, showClaimSearch, selectedTech, doSearch]);

  const handleTechChange = (tech) => {
    setSelectedTech(tech);
    setClaims([]);
    setSearchResults([]);
    setSearchQuery('');
    setShowClaimSearch(false);
    setSuccessMessage('');
  };

  const handleOpenSearch = () => {
    setShowClaimSearch(true);
    setSearchQuery('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleAddClaim = (repair) => {
    setClaims(prev => [...prev, { ...repair, payAmount: '' }]);
  };

  const handleRemoveClaim = (repairId) => {
    setClaims(prev => prev.filter(c => c.id !== repairId));
  };

  const handlePayAmountChange = (repairId, value) => {
    setClaims(prev => prev.map(c => c.id === repairId ? { ...c, payAmount: value } : c));
  };

  const handleFiftyPercent = (repairId) => {
    setClaims(prev => prev.map(c => {
      if (c.id !== repairId) return c;
      return { ...c, payAmount: (c.laborCost * 0.5).toFixed(2) };
    }));
  };

  // Filter already-added claims from search results
  const addedIds = useMemo(() => new Set(claims.map(c => c.id)), [claims]);
  const filteredResults = useMemo(() => searchResults.filter(r => !addedIds.has(r.id)), [searchResults, addedIds]);

  // Totals
  const grandTotal = useMemo(() => {
    return claims.reduce((sum, c) => {
      const amt = parseFloat(c.payAmount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [claims]);

  const allAmountsValid = claims.length > 0 && claims.every(c => {
    const amt = parseFloat(c.payAmount);
    return !isNaN(amt) && amt > 0;
  });

  const handleSubmit = () => {
    if (!allAmountsValid) return;
    setShowConfirmModal(true);
  };

  const executePayout = async () => {
    setProcessing(true);
    try {
      const items = claims.map(c => ({
        repairId: c.id,
        amount: parseFloat(c.payAmount),
      }));
      await processPayout(items, selectedTech);
      setShowConfirmModal(false);
      setClaims([]);
      setSearchResults([]);
      setShowClaimSearch(false);
      sessionStorage.removeItem('payroll_draft');
      setSuccessMessage(`Payout of $${grandTotal.toFixed(2)} processed for ${selectedTech}.`);
    } catch (error) {
      console.error("Payout failed:", error);
      alert('Failed to process payout.');
    }
    setProcessing(false);
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <DollarSign className="text-emerald-600 dark:text-emerald-500" size={32} />
            Technician Payroll
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Select a technician and add claims to process payouts.</p>
        </div>
        <button
          onClick={() => navigate('/payroll/history')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <History size={20} />
          History
        </button>
      </div>

      {/* Technician Selector */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
        <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Technician</label>
        <select
          value={selectedTech}
          onChange={(e) => handleTechChange(e.target.value)}
          className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white px-4 py-2.5 rounded-lg focus:border-amber-500 outline-none"
        >
          <option value="">Select a technician...</option>
          {technicians.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {selectedTech && (
        <>
          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
              <span className="text-emerald-400">{successMessage}</span>
              <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-600 hover:text-emerald-400">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Add Claim Button */}
          <div className="mb-6">
            <button
              onClick={handleOpenSearch}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Claim
            </button>
          </div>

          {/* Claim Search Panel */}
          {showClaimSearch && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-6 shadow-sm dark:shadow-none overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <Search size={16} className="text-zinc-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by claim #, brand, or model..."
                  className="flex-1 bg-transparent text-zinc-900 dark:text-white outline-none placeholder-zinc-500"
                />
                <button
                  onClick={() => { setShowClaimSearch(false); setSearchQuery(''); }}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
                ) : filteredResults.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    {searchResults.length > 0 && filteredResults.length === 0
                      ? 'All matching claims already added.'
                      : 'No unpaid claims found.'}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Claim #</th>
                        <th className="px-4 py-2 text-left">Unit</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-right">Labor</th>
                        <th className="px-4 py-2 text-right">Parts</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {filteredResults.map(r => (
                        <tr
                          key={r.id}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${r.status !== 'closed' ? 'bg-yellow-900/10' : ''}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">#{r.claimNumber}</td>
                          <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{r.brand} {r.model}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r.status === 'closed'
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                : 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">${r.laborCost.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">${r.partsCost.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-300 font-medium">${(r.laborCost + r.partsCost).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => handleAddClaim(r)}
                              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded font-medium transition-colors"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          {claims.some(c => c.status !== 'closed') && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              <div className="w-4 h-4 bg-yellow-900/30 border border-yellow-600 rounded"></div>
              <span>Yellow = Prepaid (claim not yet closed)</span>
            </div>
          )}

          {/* Claims Table */}
          {claims.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-6 shadow-sm dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Claim #</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Labor</th>
                      <th className="px-4 py-3 text-right">Parts</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Pay Amount</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {claims.map(claim => (
                      <tr
                        key={claim.id}
                        className={`transition-colors ${claim.status !== 'closed' ? 'bg-yellow-900/20 border-l-4 border-yellow-500' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                          <button
                            tabIndex={-1}
                            onClick={() => navigate(`/repair/${claim.id}`)}
                            className="hover:text-amber-600 dark:hover:text-amber-500 hover:underline"
                          >
                            #{claim.claimNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-white font-medium">{claim.brand} {claim.model}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            claim.status === 'closed'
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              : 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">${claim.laborCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">${claim.partsCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300 font-medium">${(claim.laborCost + claim.partsCost).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              tabIndex={-1}
                              onClick={() => handleFiftyPercent(claim.id)}
                              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded font-medium transition-colors whitespace-nowrap"
                              title="Set to 50% of labor"
                            >
                              50%
                            </button>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={claim.payAmount}
                                onChange={(e) => handlePayAmountChange(claim.id, e.target.value)}
                                placeholder="0.00"
                                className="w-28 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white pl-5 pr-2 py-1.5 rounded focus:border-emerald-500 outline-none font-mono text-sm"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            tabIndex={-1}
                            onClick={() => handleRemoveClaim(claim.id)}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Bar */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{claims.length} {claims.length === 1 ? 'claim' : 'claims'}</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Labor: <span className="font-mono text-zinc-700 dark:text-zinc-300">${claims.reduce((s, c) => s + c.laborCost, 0).toFixed(2)}</span>
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Parts: <span className="font-mono text-zinc-700 dark:text-zinc-300">${claims.reduce((s, c) => s + c.partsCost, 0).toFixed(2)}</span>
                  </span>
                  <span className="text-zinc-900 dark:text-white font-bold">
                    Total Payout: <span className="font-mono text-emerald-600 dark:text-emerald-400">${grandTotal.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          {claims.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!allAmountsValid || processing}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
              >
                {processing ? 'Processing...' : 'Process Payout'}
                <CheckCircle2 size={20} />
              </button>
            </div>
          )}

          {/* Empty state when no claims */}
          {claims.length === 0 && !showClaimSearch && !successMessage && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center shadow-sm dark:shadow-none">
              <DollarSign size={48} className="mx-auto text-zinc-400 dark:text-zinc-700 mb-4" />
              <h3 className="text-xl text-zinc-900 dark:text-zinc-300 font-medium">No Claims Added</h3>
              <p className="text-zinc-500 mt-2">Click "Add Claim" to search and add repairs for payout.</p>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Payout"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={executePayout}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-zinc-400 mb-2">
            Paying: <span className="text-white font-medium">{selectedTech}</span>
          </div>

          <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-60 overflow-y-auto">
            {claims.map(c => (
              <div key={c.id} className="flex justify-between px-4 py-2.5">
                <div>
                  <span className="text-zinc-300 font-mono text-sm">#{c.claimNumber}</span>
                  <span className="text-zinc-500 ml-2 text-sm">{c.brand} {c.model}</span>
                  {c.status !== 'closed' && (
                    <span className="ml-2 text-xs bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded">prepaid</span>
                  )}
                </div>
                <span className="text-emerald-400 font-mono font-medium">${parseFloat(c.payAmount).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between px-4 py-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <span className="text-white font-bold">Grand Total</span>
            <span className="text-white font-mono font-bold">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
