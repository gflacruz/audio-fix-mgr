import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';

export default function EditableTextSection({ title, value, onSave, icon: Icon, showWhenEmpty = true, readOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');

  if (!showWhenEmpty && !value && !isEditing) return null;

  const startEditing = () => {
    setTempValue(value || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await onSave(tempValue);
    if (success !== false) setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
          {Icon && <Icon size={18} />} {title}
        </h3>
        {!isEditing && !readOnly && (
          <button onClick={startEditing} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <Edit2 size={16} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-zinc-700 dark:text-zinc-300 focus:border-amber-500 outline-none min-h-[100px]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
            <button onClick={handleSave} className="text-sm bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
