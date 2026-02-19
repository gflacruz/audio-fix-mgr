import { useState, useEffect, useCallback } from 'react';
import { getModelNote, saveModelNote } from '@/lib/api';

export function useModelNote(brand, model) {
  const [modelNote, setModelNote] = useState(null);
  const [modelNoteLoading, setModelNoteLoading] = useState(false);

  useEffect(() => {
    if (!brand || !model) return;

    const fetchNote = async () => {
      setModelNoteLoading(true);
      try {
        const data = await getModelNote(brand, model);
        setModelNote(data);
      } catch (error) {
        console.error('Failed to load model note:', error);
      }
      setModelNoteLoading(false);
    };

    fetchNote();
  }, [brand, model]);

  const handleSaveModelNote = useCallback(async (noteText, userName) => {
    try {
      const saved = await saveModelNote(brand, model, noteText, userName);
      setModelNote(saved);
      return true;
    } catch (error) {
      console.error('Failed to save model note:', error);
      return false;
    }
  }, [brand, model]);

  return {
    modelNote,
    modelNoteLoading,
    handleSaveModelNote,
  };
}
