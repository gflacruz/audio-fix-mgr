import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';

export default function UnitSpecsCard({ ticket, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempSpecs, setTempSpecs] = useState({});

  const startEditing = () => {
    setTempSpecs({
      unitType: ticket.unitType || 'Receiver',
      brand: ticket.brand || '',
      model: ticket.model || '',
      serial: ticket.serial || '',
      priority: ticket.priority || 'normal',
      accessoriesIncluded: ticket.accessoriesIncluded || '',
      poNumber: ticket.poNumber || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await onSave(tempSpecs);
    if (success !== false) setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider">Unit Specs</h3>
        {!isEditing && (
          <button onClick={startEditing} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <Edit2 size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Unit Type</label>
              <select
                value={tempSpecs.unitType}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, unitType: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              >
                <option value="Receiver">Receiver</option>
                <option value="Power Amp">Power Amp</option>
                <option value="Integrated Amp">Integrated Amp</option>
                <option value="Preamp">Preamp</option>
                <option value="Turntable">Turntable</option>
                <option value="Speaker">Speaker</option>
                <option value="Cassette Deck">Cassette Deck</option>
                <option value="Reel-to-Reel">Reel-to-Reel</option>
                <option value="Mixer">Mixer</option>
                <option value="Effect Unit">Effect Unit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Make / Brand</label>
              <input
                type="text"
                value={tempSpecs.brand}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Model</label>
              <input
                type="text"
                value={tempSpecs.model}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, model: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Serial Number</label>
              <input
                type="text"
                value={tempSpecs.serial}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, serial: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Priority</label>
              <select
                value={tempSpecs.priority}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              >
                <option value="normal">Normal</option>
                <option value="rush">Rush</option>
                <option value="warranty">Warranty</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Accessories Included</label>
              <input
                type="text"
                value={tempSpecs.accessoriesIncluded}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, accessoriesIncluded: e.target.value }))}
                placeholder="e.g. Power Cord, Remote, Original Box"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">PO #</label>
              <input
                type="text"
                value={tempSpecs.poNumber}
                onChange={(e) => setTempSpecs(prev => ({ ...prev, poNumber: e.target.value }))}
                placeholder="Purchase Order #"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsEditing(false)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
            <button onClick={handleSave} className="text-xs bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Unit Type</label>
              <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.unitType}>{ticket.unitType || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Make</label>
              <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.brand}>{ticket.brand || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Model</label>
              <div className="text-zinc-800 dark:text-zinc-200 truncate" title={ticket.model}>{ticket.model || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Serial Number</label>
              <div className="text-zinc-800 dark:text-zinc-200 font-mono" title={ticket.serial}>{ticket.serial || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Priority</label>
              <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                ticket.priority === 'rush' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500' :
                ticket.priority === 'warranty' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {ticket.priority}
              </div>
            </div>
          </div>

          {ticket.modelVersion && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Model Version</label>
              <div className="text-zinc-800 dark:text-zinc-200">{ticket.modelVersion}</div>
            </div>
          )}
          {ticket.accessoriesIncluded && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Accessories</label>
              <div className="text-zinc-800 dark:text-zinc-200">{ticket.accessoriesIncluded}</div>
            </div>
          )}
          {ticket.poNumber && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">PO #</label>
              <div className="text-zinc-800 dark:text-zinc-200">{ticket.poNumber}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
