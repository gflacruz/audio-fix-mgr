import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Multi-select tag input with autocomplete dropdown.
 * Props:
 *   values: string[]          — currently selected categories
 *   onChange: (string[]) => void
 *   options: string[]         — autocomplete suggestions
 *   placeholder?: string
 *   className?: string
 */
export default function CategoryTagInput({ values = [], onChange, options = [], placeholder = 'Add category...', className = '' }) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = options.filter(
    o => o.toLowerCase().includes(inputValue.toLowerCase()) && !values.includes(o)
  );

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputValue('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => {
    onChange(values.filter(v => v !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex flex-wrap gap-1 items-center min-h-[34px] bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 focus-within:border-amber-500 transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-zinc-900 dark:text-white text-xs focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 py-0.5"
        />
      </div>

      {open && (inputValue.trim() || filtered.length > 0) && (
        <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => addTag(opt)}
              className="px-3 py-2 cursor-pointer text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {opt}
            </li>
          ))}
          {inputValue.trim() && !values.includes(inputValue.trim()) && !filtered.includes(inputValue.trim()) && (
            <li
              onMouseDown={() => addTag(inputValue)}
              className="px-3 py-2 cursor-pointer text-sm text-amber-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Add &ldquo;{inputValue.trim()}&rdquo;
            </li>
          )}
          {filtered.length === 0 && !inputValue.trim() && (
            <li className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500 italic">No suggestions</li>
          )}
        </ul>
      )}
    </div>
  );
}
