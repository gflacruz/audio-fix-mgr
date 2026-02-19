import { useCallback } from 'react';
import { updateRepair, addRepairNote, getRepair } from '@/lib/api';

export function useRepairUpdater(id, ticket, setTicket, user, showError) {
  const addSystemNote = useCallback(async (text) => {
    try {
      const author = user?.name || 'System';
      const note = await addRepairNote(id, { text, author });
      setTicket(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  }, [id, user, setTicket]);

  const handleStatusChange = useCallback(async (newStatus) => {
    try {
      const updatedTicket = await updateRepair(id, { status: newStatus });
      setTicket(prev => {
        const newState = {
          ...prev,
          ...updatedTicket,
          client: prev.client,
          parts: prev.parts,
          notes: prev.notes
        };
        if (updatedTicket.completed_date) {
          newState.completedDate = updatedTicket.completed_date;
        }
        if (updatedTicket.closed_date) {
          newState.closedDate = updatedTicket.closed_date;
        }
        return newState;
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }, [id, setTicket]);

  const handleTechnicianChange = useCallback(async (newTech) => {
    try {
      await updateRepair(id, { technician: newTech });
      setTicket(prev => ({ ...prev, technician: newTech }));
    } catch (error) {
      console.error("Failed to update technician:", error);
    }
  }, [id, setTicket]);

  const handleFeeToggle = useCallback(async () => {
    try {
      const newStatus = !ticket.diagnosticFeeCollected;
      const updates = { diagnosticFeeCollected: newStatus };
      if (newStatus) {
        if (!ticket.depositAmount || ticket.depositAmount === 0) {
          updates.depositAmount = ticket.diagnosticFee > 0 ? ticket.diagnosticFee : 89.00;
        }
      }
      await updateRepair(id, updates);
      setTicket(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("Failed to toggle fee:", error);
    }
  }, [id, ticket, setTicket]);

  const handleSaveFee = useCallback(async (feeAmount) => {
    try {
      const newFee = parseFloat(feeAmount);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid fee amount.");
        return false;
      }
      await updateRepair(id, { depositAmount: newFee, diagnosticFee: newFee });
      setTicket(prev => ({ ...prev, depositAmount: newFee, diagnosticFee: newFee }));
      return true;
    } catch (error) {
      console.error("Failed to update fee:", error);
      alert("Failed to update fee.");
      return false;
    }
  }, [id, setTicket]);

  const handleSaveIssue = useCallback(async (issueText) => {
    try {
      await updateRepair(id, { issue: issueText });
      setTicket(prev => ({ ...prev, issue: issueText }));
      return true;
    } catch (error) {
      console.error("Failed to update issue:", error);
      alert("Failed to update issue.");
      return false;
    }
  }, [id, setTicket]);

  const handleSaveSpecs = useCallback(async (specsData) => {
    try {
      await updateRepair(id, specsData);
      setTicket(prev => ({ ...prev, ...specsData }));
      return true;
    } catch (error) {
      console.error("Failed to update specs:", error);
      showError("Failed to update specs: " + error.message);
      return false;
    }
  }, [id, setTicket, showError]);

  const handleSaveShipment = useCallback(async (shipmentData) => {
    try {
      const sanitizedShipment = {
        ...shipmentData,
        boxLength: shipmentData.boxLength === '' ? null : parseInt(shipmentData.boxLength),
        boxWidth: shipmentData.boxWidth === '' ? null : parseInt(shipmentData.boxWidth),
        boxHeight: shipmentData.boxHeight === '' ? null : parseInt(shipmentData.boxHeight),
      };
      await updateRepair(id, sanitizedShipment);
      setTicket(prev => ({ ...prev, ...sanitizedShipment }));
      return true;
    } catch (error) {
      console.error("Failed to update shipment:", error);
      showError("Failed to update shipment: " + error.message);
      return false;
    }
  }, [id, setTicket, showError]);

  const handleOnSiteToggle = useCallback(async () => {
    try {
      const newStatus = !ticket.isOnSite;
      const newOnSiteFee = newStatus ? (ticket.onSiteFee || 125.00) : 0.00;
      await updateRepair(id, { isOnSite: newStatus, onSiteFee: newOnSiteFee });
      setTicket(prev => ({ ...prev, isOnSite: newStatus, onSiteFee: newOnSiteFee }));
    } catch (error) {
      console.error("Failed to toggle on site:", error);
    }
  }, [id, ticket, setTicket]);

  const handleShippedInToggle = useCallback(async () => {
    try {
      const newStatus = !ticket.isShippedIn;
      await updateRepair(id, { isShippedIn: newStatus });
      setTicket(prev => ({ ...prev, isShippedIn: newStatus }));
    } catch (error) {
      console.error("Failed to toggle shipped in:", error);
    }
  }, [id, ticket, setTicket]);

  const handleTaxExemptToggle = useCallback(async () => {
    try {
      const newStatus = !ticket.isTaxExempt;
      await updateRepair(id, { isTaxExempt: newStatus });
      setTicket(prev => ({ ...prev, isTaxExempt: newStatus }));
    } catch (error) {
      console.error("Failed to toggle tax exempt:", error);
    }
  }, [id, ticket, setTicket]);

  const handleRushToggle = useCallback(async () => {
    try {
      const newPriority = ticket.priority === 'rush' ? 'normal' : 'rush';
      const newRushFee = newPriority === 'rush' ? 100.00 : 0.00;
      await updateRepair(id, { priority: newPriority, rushFee: newRushFee });
      setTicket(prev => ({ ...prev, priority: newPriority, rushFee: newRushFee }));
    } catch (error) {
      console.error("Failed to toggle rush priority:", error);
    }
  }, [id, ticket, setTicket]);

  const handleSaveRushFee = useCallback(async (feeAmount) => {
    try {
      const newFee = parseFloat(feeAmount);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid rush fee.");
        return false;
      }
      await updateRepair(id, { rushFee: newFee });
      setTicket(prev => ({ ...prev, rushFee: newFee }));
      return true;
    } catch (error) {
      console.error("Failed to save rush fee:", error);
      return false;
    }
  }, [id, setTicket]);

  const handleSaveOnSiteFee = useCallback(async (feeAmount) => {
    try {
      const newFee = parseFloat(feeAmount);
      if (isNaN(newFee) || newFee < 0) {
        alert("Please enter a valid on-site fee.");
        return false;
      }
      await updateRepair(id, { onSiteFee: newFee });
      setTicket(prev => ({ ...prev, onSiteFee: newFee }));
      return true;
    } catch (error) {
      console.error("Failed to save on-site fee:", error);
      return false;
    }
  }, [id, setTicket]);

  const saveWorkPerformed = useCallback(async (workText) => {
    try {
      await updateRepair(id, { workPerformed: workText });
      setTicket(prev => ({ ...prev, workPerformed: workText }));
      return true;
    } catch (error) {
      console.error("Failed to save work:", error);
      return false;
    }
  }, [id, setTicket]);

  const confirmCloseClaim = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const updatedTicket = await updateRepair(id, { status: 'closed', completedDate: now });
      setTicket(prev => ({
        ...prev,
        status: 'closed',
        closedDate: updatedTicket.closed_date || updatedTicket.closedDate || now,
        completedDate: updatedTicket.completed_date || updatedTicket.completedDate || now
      }));
      addSystemNote(`Ticket closed by ${user?.name || 'Technician'}.`);
      return true;
    } catch (error) {
      console.error("Failed to close ticket:", error);
      return false;
    }
  }, [id, setTicket, user, addSystemNote]);

  return {
    addSystemNote,
    handleStatusChange,
    handleTechnicianChange,
    handleFeeToggle,
    handleSaveFee,
    handleSaveIssue,
    handleSaveSpecs,
    handleSaveShipment,
    handleOnSiteToggle,
    handleShippedInToggle,
    handleTaxExemptToggle,
    handleRushToggle,
    handleSaveRushFee,
    handleSaveOnSiteFee,
    saveWorkPerformed,
    confirmCloseClaim,
  };
}
