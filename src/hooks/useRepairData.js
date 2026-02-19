import { useEffect, useState, useCallback } from 'react';
import { getRepair, getTechnicians, getEstimates, getRepairNotes } from '@/lib/api';

export function useRepairData(id) {
  const [ticket, setTicket] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [estimates, setEstimates] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const foundTicket = await getRepair(id);
        setTicket(foundTicket);
        setClient(foundTicket.client);

        // Load technicians separately (non-critical)
        try {
          const techList = await getTechnicians();
          setTechnicians(techList);
        } catch (techError) {
          console.warn("Failed to load technicians:", techError);
        }
      } catch (error) {
        console.error("Failed to load repair:", error);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Load Estimates
  const loadEstimates = useCallback(async () => {
    try {
      const data = await getEstimates(id);
      setEstimates(data);
    } catch (error) {
      console.error("Failed to load estimates:", error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadEstimates();
    }
  }, [id, loadEstimates]);

  // Real-time Notes Polling
  useEffect(() => {
    if (!id) return;

    const pollNotes = async () => {
      try {
        const notes = await getRepairNotes(id);
        setTicket(prev => {
          if (!prev) return prev;
          if (JSON.stringify(prev.notes) === JSON.stringify(notes)) {
            return prev;
          }
          return { ...prev, notes };
        });
      } catch (error) {
        // Silent fail for polling to avoid console spam
      }
    };

    const intervalId = setInterval(pollNotes, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  const refreshTicket = useCallback(async () => {
    try {
      const updatedTicket = await getRepair(id);
      setTicket(updatedTicket);
      setClient(updatedTicket.client);
    } catch (error) {
      console.error("Failed to refresh ticket:", error);
    }
  }, [id]);

  return {
    ticket,
    setTicket,
    client,
    loading,
    technicians,
    estimates,
    loadEstimates,
    refreshTicket,
  };
}
