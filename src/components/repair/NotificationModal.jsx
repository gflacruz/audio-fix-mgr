import React from 'react';
import Modal from '@/components/Modal';
import { FileText, MessageSquare, Mail, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function NotificationModal({
  emailModal,
  closeEmailModal,
  proceedWithEmail,
  setEmailModal,
  client,
  estimates,
}) {
  return (
    <Modal
      isOpen={emailModal.isOpen}
      onClose={closeEmailModal}
      title={
        emailModal.step === 'success' ? 'Success' :
        emailModal.step === 'error' ? 'Error' :
        emailModal.step === 'no-estimates' ? 'No Estimates Found' :
        emailModal.step === 'select-estimate' ? 'Select a Proposal to Send' :
        `Confirm ${emailModal.method === 'text' ? 'Text' : 'Email'}`
      }
      footer={
        emailModal.step === 'confirm' ? (
          <>
            <button
              onClick={closeEmailModal}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={proceedWithEmail}
              className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Send {emailModal.method === 'text' ? 'Text' : 'Email'}
            </button>
          </>
        ) : emailModal.step === 'no-estimates' || emailModal.step === 'select-estimate' ? (
          <button
            onClick={closeEmailModal}
            className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
        ) : emailModal.step === 'success' || emailModal.step === 'error' ? (
          <button
            onClick={closeEmailModal}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        ) : null
      }
    >
      {emailModal.step === 'no-estimates' && (
        <div className="flex flex-col items-center p-4 text-center">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-zinc-400" size={32} />
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">No estimates found</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Please create an estimate first before sending a notification to the client.</p>
        </div>
      )}

      {emailModal.step === 'select-estimate' && (
        <div className="p-4 space-y-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">Multiple proposals exist. Choose which one to send to the client:</p>
          {estimates.map((est, index) => (
            <button
              key={est.id}
              onClick={() => setEmailModal(prev => ({ ...prev, step: 'confirm', selectedEstimate: est }))}
              className="w-full text-left p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-zinc-900 dark:text-white text-sm">Proposal #{estimates.length - index}</span>
                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">${parseFloat(est.totalCost).toFixed(2)}</span>
              </div>
              {est.createdTechnician && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">by {est.createdTechnician}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {emailModal.step === 'confirm' && (
        <div className="flex flex-col items-center p-4 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            {emailModal.method === 'text' ? <MessageSquare className="text-amber-600 dark:text-amber-500" size={32} /> : <Mail className="text-amber-600 dark:text-amber-500" size={32} />}
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">
            Send "{emailModal.type === 'estimate' ? 'Estimate Available' : 'Ready for Pickup'}" {emailModal.method === 'text' ? 'text' : 'email'}?
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This will notify <strong>{client?.name}</strong> at <strong>{emailModal.method === 'text' ? (client?.phone || 'Unknown Phone') : (client?.email || 'Unknown Email')}</strong>.
          </p>
          {emailModal.selectedEstimate && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1 font-medium">
              Proposal total: ${parseFloat(emailModal.selectedEstimate.totalCost).toFixed(2)}
            </p>
          )}
        </div>
      )}

      {emailModal.step === 'sending' && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 size={48} className="animate-spin text-amber-600 dark:text-amber-500" />
          <p className="text-zinc-700 dark:text-zinc-300">Sending {emailModal.method === 'text' ? 'text' : 'email'}...</p>
        </div>
      )}

      {emailModal.step === 'success' && (
        <div className="flex flex-col items-center p-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-500" size={32} />
          </div>
          <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-2">{emailModal.method === 'text' ? 'Text' : 'Email'} Sent Successfully</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            The client has been notified.
          </p>
        </div>
      )}

      {emailModal.step === 'error' && (
        <div className="flex flex-col items-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <X className="text-red-600 dark:text-red-500" size={32} />
          </div>
          <p className="text-lg text-red-400 mb-2">Failed to Send {emailModal.method === 'text' ? 'Text' : 'Email'}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 w-full break-words">
            {emailModal.error}
          </p>
        </div>
      )}
    </Modal>
  );
}
