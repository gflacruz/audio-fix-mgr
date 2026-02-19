import React, { useState } from 'react';
import { updateRepair, getRepair } from '@/lib/api';
import { FileText, Plus, Trash2, X } from 'lucide-react';

export default function InvoiceWizardModal({
  isOpen,
  onClose,
  ticket,
  repairId,
  setTicket,
  // Parts interaction
  partsSearch,
  setPartsSearch,
  partsList,
  triggerPartsSearch,
  initiateAddPart,
  handleRemovePart,
  setShowCustomPartModal,
  // Callbacks
  addSystemNote,
}) {
  const [wizardStep, setWizardStep] = useState(1);
  const [invoiceData, setInvoiceData] = useState({
    workPerformed: ticket?.workPerformed || '',
    returnShippingCarrier: ticket?.returnShippingCarrier || '',
    returnShippingCost: ticket?.returnShippingCost || '',
    laborCost: ticket?.laborCost || ''
  });

  if (!isOpen) return null;

  const partsTotal = ticket?.parts?.reduce((sum, p) => sum + p.total, 0) || 0;

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const handleWizardSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        triggerPartsSearch();
      }
    }
  };

  const handleWizardKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInvoiceNext();
    }
  };

  const handleInvoiceNext = async () => {
    try {
      if (wizardStep === 1) {
        setWizardStep(2);
        return;
      }

      if (wizardStep === 2) {
        await updateRepair(repairId, { workPerformed: invoiceData.workPerformed });
        setTicket(prev => ({ ...prev, workPerformed: invoiceData.workPerformed }));
        if (ticket.isShippedIn) {
          setWizardStep(3);
        } else {
          setWizardStep(4);
        }
        return;
      }

      if (wizardStep === 3) {
        await updateRepair(repairId, {
          returnShippingCarrier: invoiceData.returnShippingCarrier,
          returnShippingCost: parseFloat(invoiceData.returnShippingCost) || 0
        });
        setTicket(prev => ({
          ...prev,
          returnShippingCarrier: invoiceData.returnShippingCarrier,
          returnShippingCost: parseFloat(invoiceData.returnShippingCost) || 0
        }));
        setWizardStep(4);
        return;
      }

      if (wizardStep === 4) {
        await updateRepair(repairId, { laborCost: parseFloat(invoiceData.laborCost) || 0 });
        const updatedTicket = await getRepair(repairId);
        setTicket(updatedTicket);
        handleClose();
        addSystemNote('Invoice details updated via wizard.');
      }
    } catch (error) {
      console.error("Failed to save invoice step:", error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleClose = () => {
    setWizardStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600 dark:text-blue-500" />
            Prepare Invoice
            <span className="text-sm font-normal text-zinc-500 ml-2">Step {wizardStep} of {ticket.isShippedIn ? 4 : 3}</span>
          </h3>
          <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 1: Review Parts</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Ensure all parts used are listed below. Add any missing parts.</p>

              <div className="mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search parts inventory... (Shift+Enter to Search)"
                    value={partsSearch}
                    onChange={(e) => setPartsSearch(e.target.value)}
                    onKeyDown={handleWizardSearchKeyDown}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                  />
                  <button
                    onClick={() => setShowCustomPartModal(true)}
                    className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 rounded border border-zinc-300 dark:border-zinc-700 transition-colors flex items-center gap-2 text-xs font-medium"
                    title="Add Custom Item"
                  >
                    <Plus size={14} /> Custom Item
                  </button>
                </div>
                {partsSearch && (
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
                        <span className="text-emerald-600 dark:text-emerald-500">${part.retailPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ticket.parts?.map(part => (
                  <div key={part.id} className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded border border-zinc-300 dark:border-zinc-700">
                    <span className="text-zinc-800 dark:text-zinc-200">{part.name} (x{part.quantity})</span>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        {part.total > 0 ? (
                          <span className="text-zinc-700 dark:text-zinc-300 font-mono">${part.total.toFixed(2)}</span>
                        ) : (
                          <>
                            {part.retailPrice > 0 && (
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                Retail: ${part.retailPrice.toFixed(2)}
                              </span>
                            )}
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                              Cost: ${part.wholesalePrice ? part.wholesalePrice.toFixed(2) : '0.00'}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!ticket.parts || ticket.parts.length === 0) && (
                  <div className="text-center text-zinc-500 py-4 italic">No parts added.</div>
                )}
              </div>
              <div className="text-right text-lg font-bold text-zinc-900 dark:text-white mt-4">
                Parts Total: ${partsTotal.toFixed(2)}
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 2: Repairs Made</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Describe the work performed for the final invoice.</p>
              <textarea
                name="workPerformed"
                value={invoiceData.workPerformed}
                onChange={handleInvoiceChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey || e.ctrlKey) return;
                    e.preventDefault();
                    handleInvoiceNext();
                  }
                }}
                autoFocus
                placeholder="e.g. Replaced capacitors in power supply, cleaned controls, calibrated bias..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:border-amber-500 outline-none h-40"
              />
            </div>
          )}

          {wizardStep === 3 && ticket.isShippedIn && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Step 3: Return Shipping</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Enter return shipping details.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Carrier</label>
                  <input
                    name="returnShippingCarrier"
                    value={invoiceData.returnShippingCarrier}
                    onChange={handleInvoiceChange}
                    onKeyDown={handleWizardKeyDown}
                    placeholder="e.g. UPS Ground"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Shipping Cost Quote ($)</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-2 text-zinc-500">$</span>
                    <input
                      type="number"
                      name="returnShippingCost"
                      value={invoiceData.returnShippingCost}
                      onChange={handleInvoiceChange}
                      onKeyDown={handleWizardKeyDown}
                      placeholder="0.00"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-7 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {(wizardStep === 4 || (wizardStep === 3 && !ticket.isShippedIn)) && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Final Step: Labor Cost</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Enter the total labor charge.</p>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Labor Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">$</span>
                  <input
                    type="number"
                    name="laborCost"
                    value={invoiceData.laborCost}
                    onChange={handleInvoiceChange}
                    onKeyDown={handleWizardKeyDown}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-7 pr-3 py-2 text-zinc-900 dark:text-white focus:border-amber-500 outline-none text-lg"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end gap-3">
          {wizardStep > 1 && (
            <button
              onClick={() => setWizardStep(prev => prev - 1)}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleInvoiceNext}
            className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {(wizardStep === 4 || (wizardStep === 3 && !ticket.isShippedIn)) ? 'Finish & Save' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
