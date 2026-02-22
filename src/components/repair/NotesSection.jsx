import React, { useState } from 'react';
import { addRepairNote, updateRepairNote, deleteRepairNote } from '@/lib/api';
import { Save, MessageSquare, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';

function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <h3 className="text-zinc-900 dark:text-zinc-100 font-semibold">Delete Note</h3>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-5">
          Are you sure you want to delete this note? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesSection({ ticket, repairId, user, isAdmin, setTicket }) {
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const note = await addRepairNote(repairId, { text: newNote, author: user.name });
      setTicket(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
      setNewNote('');
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const saveEdit = async (noteId) => {
    if (!editText.trim()) return;
    try {
      const updated = await updateRepairNote(repairId, noteId, editText);
      setTicket(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === noteId ? { ...n, text: updated.text } : n)
      }));
      setEditingNoteId(null);
      setEditText('');
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteRepairNote(repairId, confirmDeleteId);
      setTicket(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== confirmDeleteId) }));
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <>
      {confirmDeleteId && (
        <DeleteConfirmModal
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-amber-600 dark:text-amber-500 font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={18} /> Technician Notes
          <span className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">({ticket.notes?.length || 0})</span>
        </h3>

        <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
          {ticket.notes && [...ticket.notes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((note) => (
            <div key={note.id} className="group bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase">{note.author}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(note.date).toLocaleString()}</span>
                  {isAdmin && editingNoteId !== note.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(note)}
                        title="Edit note"
                        className="text-zinc-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(note.id)}
                        title="Delete note"
                        className="text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingNoteId === note.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-amber-500 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none text-sm min-h-[80px] resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(note.id)}
                      disabled={!editText.trim()}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">{note.text}</p>
              )}
            </div>
          ))}
          {(!ticket.notes || ticket.notes.length === 0) && (
            <div className="text-zinc-500 dark:text-zinc-400 text-sm italic text-center py-4">No notes added yet.</div>
          )}
        </div>

        <form onSubmit={addNote} className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addNote(e);
              }
            }}
            placeholder="Type a new note... (Press Enter to save)"
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-4 pr-12 py-3 text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none min-h-[80px]"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="absolute bottom-3 right-3 text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
          </button>
        </form>
      </div>
    </>
  );
}
