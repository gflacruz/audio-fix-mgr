import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

export default function EstimatesList({
  estimates,
  repairId,
  estimateActionModal,
  setEstimateActionModal,
  handleApproveEstimate,
  handleDeclineEstimate,
  executeEstimateAction,
  handlePendingEstimate,
}) {
  const navigate = useNavigate();

  if (estimates.length === 0) return null;

  return (
    <>
      <div className="mb-6 space-y-2">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estimates</h4>
        {estimates.map((est, index) => (
          <div
            key={est.id}
            onClick={() => navigate(`/repair/${repairId}/estimate/${est.id}`)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-sm cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 transition-all group"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                Proposal #{estimates.length - index}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                est.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                est.status === 'declined' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}>
                {est.status}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>{new Date(est.createdAt).toLocaleDateString()}</span>
              <span>by {est.createdTechnician}</span>
            </div>
            <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-2">
              <span className="font-bold text-zinc-900 dark:text-white">${est.totalCost.toFixed(2)}</span>
              <ArrowRight size={14} className="text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors" />
            </div>

            <div className="flex gap-2 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={(e) => handleApproveEstimate(e, est)}
                className="flex-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium py-1.5 rounded transition-colors"
              >
                Approve
              </button>
              <button
                onClick={(e) => handleDeclineEstimate(e, est)}
                className="flex-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium py-1.5 rounded transition-colors"
              >
                Decline
              </button>
              <button
                onClick={(e) => handlePendingEstimate(e, est)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium py-1.5 rounded transition-colors"
              >
                Pending
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Estimate Action Modal */}
      <Modal
        isOpen={estimateActionModal.isOpen}
        onClose={() => setEstimateActionModal({ isOpen: false, type: null, estimate: null })}
        title={estimateActionModal.type === 'approve' ? 'Approve Estimate' : 'Decline Estimate'}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEstimateActionModal({ isOpen: false, type: null, estimate: null })}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeEstimateAction}
              className={`px-4 py-2 rounded-lg font-medium text-white ${
                estimateActionModal.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 dark:hover:bg-green-500'
                  : 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-500'
              }`}
            >
              {estimateActionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
            </button>
          </div>
        }
      >
        <div className="p-4">
          {estimateActionModal.type === 'approve' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600 dark:text-green-500 mb-2">
                <CheckCircle2 size={24} />
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Approve this estimate?</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300">
                This will automatically:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>Set the repair status to <strong>Repairing</strong></li>
                <li>Update the <strong>Labor Cost</strong> to matches this estimate</li>
                <li>Add a line item for <strong>Parts Cost</strong></li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  Total: ${estimateActionModal.estimate?.totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-2">
                <X size={24} />
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Decline this estimate?</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300">
                This will mark the estimate as declined. You can still create new estimates or edit this one later.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
