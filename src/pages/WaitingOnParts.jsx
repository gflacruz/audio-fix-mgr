import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, CheckCircle, X, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getWaitingOnPartsRepairs } from '@/lib/api';
import { useAwaitedParts } from '@/hooks/useAwaitedParts';

const PRIORITY_STYLES = {
  rush: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normal: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function formatDate(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WaitingOnParts() {
  const { isAtLeastSeniorTech } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const {
    addingForRepairId,
    setAddingForRepairId,
    newPartForm,
    setNewPartForm,
    editingNoteForId,
    setEditingNoteForId,
    noteTemp,
    setNoteTemp,
    deleteModal,
    setDeleteModal,
    saving,
    handleAddPart,
    handleRemovePart,
    handleMarkOrdered,
    beginEditNote,
    handleSaveNote,
    handleMarkCheckedToday,
  } = useAwaitedParts(setRepairs);

  useEffect(() => {
    getWaitingOnPartsRepairs()
      .then(setRepairs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return repairs;
    const q = search.toLowerCase();
    return repairs.filter(
      (r) =>
        r.claimNumber?.toLowerCase().includes(q) ||
        r.clientName?.toLowerCase().includes(q) ||
        r.clientCompany?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q)
    );
  }, [repairs, search]);

  return (
    <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Waiting on Parts
            </h1>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-semibold px-2.5 py-0.5 rounded-full">
              {repairs.length}
            </span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, brand, model, claim#…"
            className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm">
            {repairs.length === 0
              ? 'No repairs are currently waiting on parts.'
              : 'No repairs match your search.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((repair) => {
              const isAddingPart = addingForRepairId === repair.id;
              const isEditingNote = editingNoteForId === repair.id;

              return (
                <div
                  key={repair.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
                >
                  {/* Section A — Header row */}
                  <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link
                        to={`/repair/${repair.id}`}
                        className="text-amber-600 dark:text-amber-400 font-mono text-sm font-semibold hover:underline shrink-0"
                      >
                        #{repair.claimNumber}
                      </Link>
                      <span className="text-zinc-900 dark:text-white font-medium truncate">
                        {repair.brand} {repair.model}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-sm truncate">
                        {repair.clientCompany
                          ? `${repair.clientName} (${repair.clientCompany})`
                          : repair.clientName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {repair.priority && repair.priority !== 'normal' && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            PRIORITY_STYLES[repair.priority] || PRIORITY_STYLES.normal
                          }`}
                        >
                          {repair.priority}
                        </span>
                      )}

                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Checked:{' '}
                        <span className={!repair.partsLastChecked ? 'text-red-500' : ''}>
                          {formatDateTime(repair.partsLastChecked)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Sections B/C/D — hidden when nothing to show and no actions available */}
                  {(repair.partsNote || repair.awaitedParts.length > 0 || isEditingNote || isAddingPart || isAtLeastSeniorTech) && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-4">
                    {(repair.partsNote || isEditingNote) && (
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-1">
                        Parts Note
                      </span>

                      {isEditingNote ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteTemp}
                            onChange={(e) => setNoteTemp(e.target.value)}
                            rows={3}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                            placeholder="Add a note about the parts situation…"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveNote(repair.id)}
                              disabled={saving}
                              className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingNoteForId(null)}
                              className="text-xs px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                          {repair.partsNote}
                        </p>
                      )}
                    </div>
                    )}

                    {/* Section C — Awaited Parts */}
                    {(repair.awaitedParts.length > 0 || isAddingPart) && (
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block mb-2">
                        Awaited Parts{' '}
                        <span className="normal-case font-normal">
                          ({repair.awaitedParts.length})
                        </span>
                      </span>

                      {/* Add-part form */}
                      {isAddingPart && (
                        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 mb-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 block">
                                Part Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={newPartForm.name}
                                onChange={(e) =>
                                  setNewPartForm((f) => ({ ...f, name: e.target.value }))
                                }
                                placeholder="e.g. Output transformer"
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 block">
                                Part Number
                              </label>
                              <input
                                type="text"
                                value={newPartForm.partNumber}
                                onChange={(e) =>
                                  setNewPartForm((f) => ({ ...f, partNumber: e.target.value }))
                                }
                                placeholder="e.g. OT-123A"
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 block">
                              Notes
                            </label>
                            <input
                              type="text"
                              value={newPartForm.notes}
                              onChange={(e) =>
                                setNewPartForm((f) => ({ ...f, notes: e.target.value }))
                              }
                              placeholder="Supplier, ETA, etc."
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddPart(repair.id)}
                              disabled={saving || !newPartForm.name.trim()}
                              className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
                            >
                              {saving ? 'Adding…' : 'Add'}
                            </button>
                            <button
                              onClick={() => setAddingForRepairId(null)}
                              className="text-xs px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Parts list */}
                      {repair.awaitedParts.length > 0 && (
                        <ul className="space-y-1.5">
                          {repair.awaitedParts.map((part) => (
                            <li
                              key={part.id}
                              className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                  {part.name}
                                </span>
                                {part.partNumber && (
                                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                    P/N: {part.partNumber}
                                  </span>
                                )}
                                {part.notes && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    {part.notes}
                                  </p>
                                )}
                              </div>
                              {isAtLeastSeniorTech && (
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                  {part.orderedAt ? (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                      Ordered {formatDate(part.orderedAt)}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleMarkOrdered(repair.id, part.id)}
                                      className="text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                                      aria-label="Mark as ordered"
                                      title="Mark as ordered"
                                    >
                                      <Package size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      setDeleteModal({ repairId: repair.id, awaitedPartId: part.id })
                                    }
                                    className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    aria-label="Remove part"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    )}

                    {/* Section D — Actions row (senior tech only) */}
                    {isAtLeastSeniorTech && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setAddingForRepairId(isAddingPart ? null : repair.id);
                            if (!isAddingPart) setNewPartForm({ name: '', partNumber: '', notes: '' });
                          }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                        >
                          <Plus size={13} />
                          Add Part
                        </button>
                        <button
                          onClick={() => beginEditNote(repair.id, repair.partsNote)}
                          disabled={isEditingNote}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {repair.partsNote ? 'Edit Note' : 'Add Note'}
                        </button>
                        <button
                          onClick={() => handleMarkCheckedToday(repair.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle size={13} />
                          Mark Checked Today
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl w-full max-w-sm p-6 shadow-xl relative">
            <button
              onClick={() => setDeleteModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              Remove awaited part?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              This will permanently remove the part from the tracking list.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePart}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
