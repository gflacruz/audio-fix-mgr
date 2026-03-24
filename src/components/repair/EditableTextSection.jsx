import React, { useState } from 'react';
import { Edit2, Sparkles, Loader2, X } from 'lucide-react';

export default function EditableTextSection({ title, value, onSave, icon: Icon, showWhenEmpty = true, readOnly = false, onAskAI }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');

  if (!showWhenEmpty && !value && !isEditing) return null;

  const startEditing = () => {
    setTempValue(value || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await onSave(tempValue);
    if (success !== false) setIsEditing(false);
  };

  const handleAskAI = async () => {
    setAiResult('');
    setAiError('');
    setAiOpen(true);
    setAiLoading(true);
    try {
      const data = await onAskAI();
      setAiResult(data.result);
    } catch (err) {
      setAiError(err.message || 'Failed to get AI response.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
            {Icon && <Icon size={18} />} {title}
          </h3>
          <div className="flex items-center gap-2">
            {onAskAI && !isEditing && (
              <button
                onClick={handleAskAI}
                disabled={!value}
                title={value ? 'Ask AI for diagnostic suggestions' : 'No issue text to analyze'}
                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles size={14} />
                Ask AI
              </button>
            )}
            {!isEditing && !readOnly && (
              <button onClick={startEditing} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                <Edit2 size={16} />
              </button>
            )}
          </div>
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

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                AI Diagnostic Suggestions
              </h2>
              <button onClick={() => setAiOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {aiLoading && (
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                  <Loader2 size={20} className="animate-spin text-purple-500" />
                  <span>Analyzing issue...</span>
                </div>
              )}
              {aiError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
                  {aiError}
                </div>
              )}
              {aiResult && (
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {aiResult}
                </p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
              <button
                onClick={() => setAiOpen(false)}
                className="text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
