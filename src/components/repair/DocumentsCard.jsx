import React, { useState } from 'react';
import { printDiagnosticReceipt, printRepairInvoice } from '@/lib/printer';
import { Printer, CheckCircle2 } from 'lucide-react';

export default function DocumentsCard({ ticket, client, technicians, onTechnicianChange, onClose }) {
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handlePrintInvoice = () => {
    printRepairInvoice(ticket, client);
    if (ticket.status !== 'closed') {
      setShowCloseModal(true);
    }
  };

  const handleConfirmClose = async () => {
    const success = await onClose();
    if (success !== false) setShowCloseModal(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider mb-4">Documents</h3>
        <div className="space-y-3">
          <button
            onClick={() => printDiagnosticReceipt(ticket, client)}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700"
          >
            <Printer size={18} />
            Print Claim
          </button>
          <button
            onClick={handlePrintInvoice}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 py-2.5 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700"
          >
            <Printer size={18} />
            Print Invoice
          </button>
        </div>
      </div>

      {/* Close Claim Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-blue-600 dark:text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Close this Claim?</h3>

              {ticket.technician === 'Unassigned' ? (
                <div className="mb-6 text-left">
                  <p className="text-amber-600 dark:text-amber-500 text-sm mb-3 font-medium text-center">
                    ⚠️ Technician Required
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 text-center">
                    Please select the technician who worked on this repair before closing the ticket.
                  </p>
                  <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1">Assign Technician</label>
                  <select
                    value={ticket.technician || 'Unassigned'}
                    onChange={(e) => onTechnicianChange(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                  >
                    <option value="Unassigned">Select Technician...</option>
                    {technicians.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                  You just printed the invoice. Would you like to mark this repair ticket as <strong>Closed</strong> now?
                </p>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  No, keep open
                </button>
                <button
                  onClick={handleConfirmClose}
                  disabled={ticket.technician === 'Unassigned'}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Yes, Close Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
