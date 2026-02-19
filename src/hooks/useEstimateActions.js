import { useState, useCallback } from 'react';
import { updateEstimate, updateRepair, addCustomRepairPart, getRepair } from '@/lib/api';

export function useEstimateActions(id, estimates, loadEstimates, setTicket, addSystemNote) {
  const [estimateActionModal, setEstimateActionModal] = useState({
    isOpen: false,
    type: null,
    estimate: null
  });

  const handleApproveEstimate = useCallback((e, estimate) => {
    e.stopPropagation();
    setEstimateActionModal({ isOpen: true, type: 'approve', estimate });
  }, []);

  const handleDeclineEstimate = useCallback((e, estimate) => {
    e.stopPropagation();
    setEstimateActionModal({ isOpen: true, type: 'decline', estimate });
  }, []);

  const executeEstimateAction = useCallback(async () => {
    const { type, estimate } = estimateActionModal;
    if (!estimate) return;

    try {
      const now = new Date().toISOString();

      if (type === 'approve') {
        await updateEstimate(estimate.id, {
          status: 'approved',
          approvedDate: now,
          notifiedDate: now
        });

        await updateRepair(id, {
          status: 'repairing',
          laborCost: estimate.laborCost
        });

        if (estimate.partsCost > 0) {
          await addCustomRepairPart(id, {
            name: "Approved Estimate Parts",
            price: parseFloat(estimate.partsCost),
            quantity: 1
          });
        }

        const otherEstimates = estimates.filter(e => e.id !== estimate.id && e.status !== 'approved' && e.status !== 'declined');
        await Promise.all(otherEstimates.map(e => updateEstimate(e.id, { status: 'declined', notifiedDate: now })));

        addSystemNote(`Estimate #${estimate.id} approved. Status set to Repairing.`);
      } else if (type === 'decline') {
        await updateEstimate(estimate.id, {
          status: 'declined',
          notifiedDate: now
        });
        addSystemNote(`Estimate #${estimate.id} declined.`);
      }

      await loadEstimates();
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);

      setEstimateActionModal({ isOpen: false, type: null, estimate: null });
    } catch (error) {
      console.error(`Failed to ${type} estimate:`, error);
      alert(`Failed to ${type} estimate: ` + error.message);
    }
  }, [id, estimateActionModal, estimates, loadEstimates, setTicket, addSystemNote]);

  const handlePendingEstimate = useCallback(async (e, estimate) => {
    e.stopPropagation();
    try {
      await updateEstimate(estimate.id, { status: 'pending' });
      await loadEstimates();
    } catch (error) {
      console.error("Failed to set estimate to pending:", error);
    }
  }, [loadEstimates]);

  return {
    estimateActionModal,
    setEstimateActionModal,
    handleApproveEstimate,
    handleDeclineEstimate,
    executeEstimateAction,
    handlePendingEstimate,
  };
}
