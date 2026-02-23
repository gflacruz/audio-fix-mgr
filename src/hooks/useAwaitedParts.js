import { useState, useCallback } from 'react';
import { addAwaitedPart, removeAwaitedPart, updatePartsFields } from '@/lib/api';

const EMPTY_FORM = { name: '', partNumber: '', notes: '' };

export const useAwaitedParts = (setRepairs) => {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [addingForRepairId, setAddingForRepairId] = useState(null);
  const [newPartForm, setNewPartForm] = useState(EMPTY_FORM);
  const [editingNoteForId, setEditingNoteForId] = useState(null);
  const [noteTemp, setNoteTemp] = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // { repairId, awaitedPartId }
  const [saving, setSaving] = useState(false);

  const patchRepair = useCallback((repairId, changes) => {
    setRepairs((prev) =>
      prev.map((r) => (r.id === repairId ? { ...r, ...changes } : r))
    );
  }, [setRepairs]);

  const toggleExpand = useCallback((repairId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(repairId)) {
        next.delete(repairId);
      } else {
        next.add(repairId);
      }
      return next;
    });
  }, []);

  const handleAddPart = useCallback(async (repairId) => {
    if (!newPartForm.name.trim()) return;
    setSaving(true);
    try {
      const created = await addAwaitedPart(repairId, newPartForm);
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === repairId
            ? { ...r, awaitedParts: [...r.awaitedParts, created] }
            : r
        )
      );
      setNewPartForm(EMPTY_FORM);
      setAddingForRepairId(null);
    } catch (err) {
      console.error('Failed to add awaited part:', err);
    } finally {
      setSaving(false);
    }
  }, [newPartForm, setRepairs]);

  const handleRemovePart = useCallback(async () => {
    if (!deleteModal) return;
    const { repairId, awaitedPartId } = deleteModal;
    try {
      await removeAwaitedPart(repairId, awaitedPartId);
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === repairId
            ? { ...r, awaitedParts: r.awaitedParts.filter((p) => p.id !== awaitedPartId) }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to remove awaited part:', err);
    } finally {
      setDeleteModal(null);
    }
  }, [deleteModal, setRepairs]);

  const beginEditNote = useCallback((repairId, currentNote) => {
    setEditingNoteForId(repairId);
    setNoteTemp(currentNote || '');
  }, []);

  const handleSaveNote = useCallback(async (repairId) => {
    setSaving(true);
    try {
      await updatePartsFields(repairId, { partsNote: noteTemp });
      patchRepair(repairId, { partsNote: noteTemp });
      setEditingNoteForId(null);
    } catch (err) {
      console.error('Failed to save parts note:', err);
    } finally {
      setSaving(false);
    }
  }, [noteTemp, patchRepair]);

  const handleMarkCheckedToday = useCallback(async (repairId) => {
    const now = new Date().toISOString();
    try {
      await updatePartsFields(repairId, { partsLastChecked: now });
      patchRepair(repairId, { partsLastChecked: now });
    } catch (err) {
      console.error('Failed to mark checked today:', err);
    }
  }, [patchRepair]);

  return {
    expandedIds,
    addingForRepairId,
    setAddingForRepairId,
    newPartForm,
    setNewPartForm,
    editingNoteForId,
    setEditingNoteForId,
    noteTemp,
    setNoteTemp,
    deleteModal,
    setDeleteModal,
    saving,
    toggleExpand,
    handleAddPart,
    handleRemovePart,
    beginEditNote,
    handleSaveNote,
    handleMarkCheckedToday,
  };
};
