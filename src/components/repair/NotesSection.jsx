import React, { useState } from 'react';
import { addRepairNote } from '@/lib/api';
import { Save } from 'lucide-react';

export default function NotesSection({ ticket, repairId, user, setTicket }) {
  const [newNote, setNewNote] = useState('');

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const note = await addRepairNote(repairId, { text: newNote, author: user.name });
      setTicket(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
      setNewNote('');
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <h3 className="text-amber-600 dark:text-amber-500 font-semibold mb-4 flex items-center gap-2">
        Technician Notes
        <span className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">({ticket.notes?.length || 0})</span>
      </h3>

      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {ticket.notes && [...ticket.notes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((note) => (
          <div key={note.id} className="bg-zinc-50 dark:bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">{note.author}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(note.date).toLocaleString()}</span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">{note.text}</p>
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
  );
}
