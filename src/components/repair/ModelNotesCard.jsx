import React, { useState } from 'react';
import { Edit2, BookOpen } from 'lucide-react';

export default function ModelNotesCard({ brand, model, modelNote, onSave, loading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempNote, setTempNote] = useState('');

  const startEditing = () => {
    setTempNote(modelNote?.note || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await onSave(tempNote);
    if (success !== false) setIsEditing(false);
  };

  if (loading) return null;

  const hasNote = modelNote && modelNote.note && modelNote.note.trim();

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
          <BookOpen size={18} />
          Make & Model Notes
        </h3>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Shared notes for all <span className="font-medium text-zinc-700 dark:text-zinc-300">{brand} {model}</span> repairs
      </p>

      {isEditing ? (
        <div>
          <textarea
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
            placeholder={`Add notes about ${brand} ${model} that apply to all repairs of this model...`}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-700 dark:text-zinc-300 focus:border-amber-500 outline-none min-h-[100px] resize-y"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-sm bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : hasNote ? (
        <div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {modelNote.note}
          </p>
          {modelNote.updatedBy && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
              Last edited by {modelNote.updatedBy}
              {modelNote.updatedAt && ` on ${new Date(modelNote.updatedAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">
          No notes for this model yet. Click edit to add notes.
        </p>
      )}
    </div>
  );
}
