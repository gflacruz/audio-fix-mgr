import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const inputCls = "w-full bg-zinc-50 dark:bg-zinc-950 focus:bg-zinc-100 dark:focus:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-white focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 focus:outline-none transition-colors";

export default function ComboSelect({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <input
        type="text"
        value={open ? search : value}
        readOnly={!open}
        onChange={(e) => setSearch(e.target.value)}
        onBlur={() => setTimeout(() => { setOpen(false); setSearch(''); }, 150)}
        onClick={() => setOpen(prev => !prev)}
        className={`${inputCls} cursor-pointer pr-8 ${className}`}
      />
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-[216px] overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false); setSearch(''); }}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors
                ${value === opt
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
            >
              {opt}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500 italic">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
