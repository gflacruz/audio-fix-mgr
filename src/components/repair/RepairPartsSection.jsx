import React from 'react';
import Modal from '@/components/Modal';
import { Package, Plus, Trash2, X } from 'lucide-react';

export default function RepairPartsSection({
  ticket,
  partsSearch,
  setPartsSearch,
  partsList,
  handlePartsSearchKeyDown,
  isAddingPart,
  setIsAddingPart,
  selectedPartForAdd,
  addQuantity,
  setAddQuantity,
  initiateAddPart,
  confirmAddPart,
  cancelAddPart,
  showCustomPartModal,
  setShowCustomPartModal,
  customPartData,
  setCustomPartData,
  handleCustomPartSubmit,
  deletePartModal,
  setDeletePartModal,
  handleRemovePart,
  confirmDeletePart,
}) {
  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
            Parts & Materials
          </h3>
          <button
            onClick={() => setIsAddingPart(!isAddingPart)}
            className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Add Part
          </button>
        </div>

        {isAddingPart && (
          <div className="mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                autoFocus
                placeholder="Search parts inventory... (Press Enter)"
                value={partsSearch}
                onChange={(e) => setPartsSearch(e.target.value)}
                onKeyDown={handlePartsSearchKeyDown}
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
              <button
                onClick={() => { setIsAddingPart(false); setPartsSearch(''); }}
                className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 px-3 rounded transition-colors"
                title="Cancel Adding Part"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {partsList.map(part => (
                <div
                  key={part.id}
                  onClick={() => initiateAddPart(part)}
                  className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded cursor-pointer text-sm"
                >
                  <div>
                    <span className="text-zinc-700 dark:text-zinc-300 block">{part.name}</span>
                    <span className={`text-xs ${part.quantityInStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                      In Stock: {part.quantityInStock}
                    </span>
                  </div>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs mr-2">${part.retailPrice.toFixed(2)}</span>
                  <span className="text-emerald-600 dark:text-emerald-500">$0.00</span>
                </div>
              ))}
              {partsList.length === 0 && partsSearch && (
                <div className="text-zinc-500 text-xs text-center py-2">No parts found.</div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {ticket.parts && ticket.parts.length > 0 ? (
            ticket.parts.map((part) => (
              <div key={part.id} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-50/50 dark:bg-zinc-950/50 p-3 rounded border border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-zinc-500 dark:text-zinc-400" />
                  <div>
                    <div className="text-sm text-zinc-800 dark:text-zinc-200">{part.name}</div>
                    <div className="text-xs text-zinc-500">Qty: {part.quantity} × ${part.price.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {part.total > 0 ? (
                    <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">${part.total.toFixed(2)}</span>
                  ) : (
                    <div className="flex flex-col items-end">
                      {part.retailPrice > 0 && (
                        <span className="text-[10px] text-zinc-400">
                          Retail: ${part.retailPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                        Cost: ${part.wholesalePrice ? part.wholesalePrice.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemovePart(part.id)}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-zinc-500 dark:text-zinc-400 text-sm italic text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded">
              No parts assigned to this repair.
            </div>
          )}
        </div>
      </div>

      {/* Add Part Quantity Modal */}
      {selectedPartForAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Part</h3>
              <button onClick={cancelAddPart} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={confirmAddPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Part</label>
                <div className="text-zinc-900 dark:text-white text-lg font-medium">{selectedPartForAdd.name}</div>
                <div className={`text-sm mt-1 ${selectedPartForAdd.quantityInStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  Available in Stock: {selectedPartForAdd.quantityInStock}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Quantity to Use</label>
                <input
                  type="number"
                  min="1"
                  max={selectedPartForAdd.quantityInStock}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelAddPart}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addQuantity > selectedPartForAdd.quantityInStock || addQuantity < 1}
                  className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add to Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Part Modal */}
      {showCustomPartModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80]">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Custom Item</h3>
              <button onClick={() => setShowCustomPartModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCustomPartSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Item Name / Description</label>
                <input
                  type="text"
                  value={customPartData.name}
                  onChange={(e) => setCustomPartData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  autoFocus
                  placeholder="e.g. Vintage Capacitor Kit"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPartData.price}
                    onChange={(e) => setCustomPartData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={customPartData.quantity}
                    onChange={(e) => setCustomPartData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomPartModal(false)}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Part Confirmation Modal */}
      <Modal
        isOpen={deletePartModal.isOpen}
        onClose={() => setDeletePartModal({ isOpen: false, linkId: null })}
        title="Confirm Remove Part"
        footer={
          <>
            <button
              onClick={() => setDeletePartModal({ isOpen: false, linkId: null })}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeletePart}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Remove Part
            </button>
          </>
        }
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Trash2 className="text-red-600 dark:text-red-500" size={32} />
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">
            Are you sure you want to remove this part?
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This action will remove the part from the ticket and restore inventory quantity.
          </p>
        </div>
      </Modal>
    </>
  );
}
