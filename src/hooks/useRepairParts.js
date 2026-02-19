import { useState, useCallback } from 'react';
import { getParts, addRepairPart, removeRepairPart, addCustomRepairPart, getRepair } from '@/lib/api';

export function useRepairParts(id, ticket, setTicket) {
  const [partsSearch, setPartsSearch] = useState('');
  const [partsList, setPartsList] = useState([]);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedPartForAdd, setSelectedPartForAdd] = useState(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [showCustomPartModal, setShowCustomPartModal] = useState(false);
  const [customPartData, setCustomPartData] = useState({ name: '', price: '', quantity: 1 });
  const [deletePartModal, setDeletePartModal] = useState({ isOpen: false, linkId: null });

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
        setIsAddingPart(false);
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
    if (!customPartData.name || !customPartData.price) {
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
      setIsAddingPart(false);
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

  return {
    partsSearch,
    setPartsSearch,
    partsList,
    triggerPartsSearch,
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
  };
}
