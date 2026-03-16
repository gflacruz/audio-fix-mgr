import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getParts, addRepairPart, removeRepairPart, addCustomRepairPart, getRepair,
         getAwaitedParts, addAwaitedPart, removeAwaitedPart, markAwaitedPartOrdered, addRepairNote } from '@/lib/api';

export function useRepairParts(id, ticket, setTicket) {
  const { user } = useAuth();
  const [partsSearch, setPartsSearch] = useState('');
  const [partsList, setPartsList] = useState([]);
  const [addModalStep, setAddModalStep] = useState(null); // null | 'select' | 'inventory' | 'awaited'
  const [selectedPartForAdd, setSelectedPartForAdd] = useState(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [showCustomPartModal, setShowCustomPartModal] = useState(false);
  const [customPartData, setCustomPartData] = useState({ name: '', price: '', quantity: 1 });
  const [deletePartModal, setDeletePartModal] = useState({ isOpen: false, linkId: null });
  const [awaitedParts, setAwaitedParts] = useState([]);
  const [awaitedPartForm, setAwaitedPartForm] = useState({ name: '', partNumber: '', notes: '' });
  const [awaitedPartSaving, setAwaitedPartSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAwaitedParts(id)
      .then(setAwaitedParts)
      .catch(console.error);
  }, [id]);

  const triggerPartsSearch = useCallback(async () => {
    if (!partsSearch.trim()) {
      setPartsList([]);
      return;
    }
    try {
      const response = await getParts(partsSearch, 1, 50);
      if (Array.isArray(response)) {
        setPartsList(response);
      } else {
        setPartsList(response.data || []);
      }
    } catch (error) {
      console.error("Failed to search parts:", error);
    }
  }, [partsSearch]);

  const handlePartsSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerPartsSearch();
    }
  }, [triggerPartsSearch]);

  const initiateAddPart = useCallback((part) => {
    setSelectedPartForAdd(part);
    setAddQuantity(1);
  }, []);

  const confirmAddPart = useCallback(async (e, { inWizard = false } = {}) => {
    e.preventDefault();
    if (!selectedPartForAdd) return;

    const quantity = parseInt(addQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    if (quantity > selectedPartForAdd.quantityInStock) {
      alert(`Cannot add ${quantity} items. Only ${selectedPartForAdd.quantityInStock} in stock.`);
      return;
    }

    try {
      const priceOverride = 0;
      await addRepairPart(id, selectedPartForAdd.id, quantity, priceOverride);
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);

      if (!inWizard) {
        setAddModalStep(null);
      }
      setPartsSearch('');
      setSelectedPartForAdd(null);
    } catch (error) {
      console.error("Failed to add part:", error);
      alert("Failed to add part: " + error.message);
    }
  }, [id, selectedPartForAdd, addQuantity, setTicket]);

  const cancelAddPart = useCallback(() => {
    setSelectedPartForAdd(null);
    setAddQuantity(1);
  }, []);

  const handleCustomPartSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!customPartData.name || customPartData.price === '') {
      alert("Name and Price are required.");
      return;
    }
    try {
      await addCustomRepairPart(id, {
        name: customPartData.name,
        price: parseFloat(customPartData.price),
        quantity: parseInt(customPartData.quantity, 10) || 1
      });
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
      setShowCustomPartModal(false);
      setCustomPartData({ name: '', price: '', quantity: 1 });
      setAddModalStep(null);
    } catch (error) {
      console.error("Failed to add custom part:", error);
      alert("Failed to add custom part: " + error.message);
    }
  }, [id, customPartData, setTicket]);

  const handleRemovePart = useCallback((linkId) => {
    setDeletePartModal({ isOpen: true, linkId });
  }, []);

  const confirmDeletePart = useCallback(async () => {
    if (!deletePartModal.linkId) return;
    try {
      await removeRepairPart(id, deletePartModal.linkId);
      setTicket(prev => ({
        ...prev,
        parts: prev.parts.filter(p => p.id !== deletePartModal.linkId)
      }));
      setDeletePartModal({ isOpen: false, linkId: null });
    } catch (error) {
      console.error("Failed to remove part:", error);
      alert("Failed to remove part.");
    }
  }, [id, deletePartModal, setTicket]);

  const handleAddAwaitedPart = useCallback(async () => {
    if (!awaitedPartForm.name.trim()) return;
    setAwaitedPartSaving(true);
    try {
      const created = await addAwaitedPart(id, awaitedPartForm);
      setAwaitedParts((prev) => [...prev, created]);
      setAddModalStep(null);
      setAwaitedPartForm({ name: '', partNumber: '', notes: '' });
      await addRepairNote(id, {
        text: `Awaited part added - ${created.name}${created.partNumber ? ` / ${created.partNumber}` : ''}`,
        author: user?.name || 'Unknown',
      });
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Failed to add awaited part:', err);
      alert('Failed to add awaited part: ' + err.message);
    } finally {
      setAwaitedPartSaving(false);
    }
  }, [id, awaitedPartForm, user, setTicket]);

  const handleRemoveAwaitedPart = useCallback(async (awaitedPartId) => {
    try {
      await removeAwaitedPart(id, awaitedPartId);
      setAwaitedParts((prev) => prev.filter((p) => p.id !== awaitedPartId));
    } catch (err) {
      console.error('Failed to remove awaited part:', err);
      alert('Failed to remove awaited part: ' + err.message);
    }
  }, [id]);

  const handleMarkAwaitedOrdered = useCallback(async (awaitedPartId) => {
    try {
      const updated = await markAwaitedPartOrdered(id, awaitedPartId);
      setAwaitedParts((prev) => prev.map((p) => p.id === awaitedPartId ? updated : p));
      const partName = updated.name;
      const partNumber = updated.partNumber ? ` / ${updated.partNumber}` : '';
      const orderedDate = new Date(updated.orderedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
      await addRepairNote(id, {
        text: `${partName}${partNumber} ordered on ${orderedDate}`,
        author: user?.name || 'Unknown',
      });
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Failed to mark awaited part ordered:', err);
      alert('Failed to mark part ordered: ' + err.message);
    }
  }, [id, user, setTicket]);

  return {
    partsSearch,
    setPartsSearch,
    partsList,
    triggerPartsSearch,
    handlePartsSearchKeyDown,
    addModalStep,
    setAddModalStep,
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
    awaitedParts,
    awaitedPartForm,
    setAwaitedPartForm,
    awaitedPartSaving,
    handleAddAwaitedPart,
    handleRemoveAwaitedPart,
    handleMarkAwaitedOrdered,
  };
}
