import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteRepair } from '@/lib/api';
import { useError } from '@/context/ErrorContext';
import Modal from '@/components/Modal';
import { Trash2 } from 'lucide-react';

export default function AdminActionsCard({ repairId, onDeleted }) {
  const navigate = useNavigate();
  const { showError } = useError();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleDeleteRepair = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert("Please type 'DELETE' to confirm.");
      return;
    }

    try {
      await deleteRepair(repairId);
      if (onDeleted) {
        onDeleted();
      } else {
        navigate('/workbench');
      }
    } catch (error) {
      console.error("Failed to delete repair:", error);
      showError("Failed to delete repair: " + error.message);
    }
  };

  return (
    <>
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-6">
        <h3 className="text-red-600 dark:text-red-500 font-semibold text-sm uppercase tracking-wider mb-4">Admin Actions</h3>
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 py-2.5 rounded-lg transition-colors border border-red-200 dark:border-red-800"
        >
          <Trash2 size={18} />
          Delete Repair Ticket
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Delete Repair Ticket"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRepair}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Delete Permanently
            </button>
          </>
        }
      >
        <div className="p-4">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="text-red-600 dark:text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Delete Repair Ticket?</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              This action cannot be undone. This will permanently delete the repair ticket, all associated notes, and photos.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
