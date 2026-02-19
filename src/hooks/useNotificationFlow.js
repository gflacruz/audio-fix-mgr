import { useState, useCallback } from 'react';
import { sendEstimateEmail, sendPickupEmail, sendEstimateText, sendPickupText, updateRepair } from '@/lib/api';

export function useNotificationFlow(id, client, estimates, addSystemNote, setTicket) {
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    type: null,
    method: 'email',
    step: 'idle',
    error: null,
    selectedEstimate: null
  });

  const handleSendEstimateEmail = useCallback(() => {
    const method = client?.primaryNotification === 'Text' ? 'text' : 'email';
    if (estimates.length === 0) {
      setEmailModal({ isOpen: true, type: 'estimate', method, step: 'no-estimates', error: null, selectedEstimate: null });
    } else if (estimates.length === 1) {
      setEmailModal({ isOpen: true, type: 'estimate', method, step: 'confirm', error: null, selectedEstimate: estimates[0] });
    } else {
      setEmailModal({ isOpen: true, type: 'estimate', method, step: 'select-estimate', error: null, selectedEstimate: null });
    }
  }, [client, estimates]);

  const handleSendPickupEmail = useCallback(() => {
    const method = client?.primaryNotification === 'Text' ? 'text' : 'email';
    setEmailModal({ isOpen: true, type: 'pickup', method, step: 'confirm', error: null, selectedEstimate: null });
  }, [client]);

  const proceedWithEmail = useCallback(async () => {
    if (!emailModal.type) return;

    setEmailModal(prev => ({ ...prev, step: 'sending', error: null }));

    try {
      if (emailModal.method === 'text') {
        if (emailModal.type === 'estimate') {
          await sendEstimateText(id, emailModal.selectedEstimate?.id);
          await updateRepair(id, { status: 'estimate' });
          setTicket(prev => ({ ...prev, status: 'estimate' }));
          addSystemNote('Text sent: Estimate Available');
        } else if (emailModal.type === 'pickup') {
          await sendPickupText(id);
          addSystemNote('Text sent: Ready for Pickup');
        }
      } else {
        if (emailModal.type === 'estimate') {
          await sendEstimateEmail(id, emailModal.selectedEstimate?.id);
          await updateRepair(id, { status: 'estimate' });
          setTicket(prev => ({ ...prev, status: 'estimate' }));
          addSystemNote('Email sent: Estimate Available');
        } else if (emailModal.type === 'pickup') {
          await sendPickupEmail(id);
          addSystemNote('Email sent: Ready for Pickup');
        }
      }
      setEmailModal(prev => ({ ...prev, step: 'success' }));
    } catch (error) {
      console.error("Failed to send notification:", error);
      setEmailModal(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Failed to send notification'
      }));
    }
  }, [id, emailModal, addSystemNote, setTicket]);

  const closeEmailModal = useCallback(() => {
    setEmailModal(prev => ({ ...prev, isOpen: false, step: 'idle' }));
  }, []);

  return {
    emailModal,
    setEmailModal,
    handleSendEstimateEmail,
    handleSendPickupEmail,
    proceedWithEmail,
    closeEmailModal,
  };
}
