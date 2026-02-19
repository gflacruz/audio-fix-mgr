import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';

export default function ShipmentDetailsCard({ ticket, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempShipment, setTempShipment] = useState({});

  const startEditing = () => {
    setTempShipment({
      shippingCarrier: ticket.shippingCarrier || '',
      boxLength: ticket.boxLength || '',
      boxWidth: ticket.boxWidth || '',
      boxHeight: ticket.boxHeight || '',
      returnShippingCarrier: ticket.returnShippingCarrier || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await onSave(tempShipment);
    if (success !== false) setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider">Shipment Details</h3>
        {!isEditing && (
          <button onClick={startEditing} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <Edit2 size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Inbound Carrier</label>
            <input
              type="text"
              value={tempShipment.shippingCarrier}
              onChange={(e) => setTempShipment(prev => ({ ...prev, shippingCarrier: e.target.value }))}
              placeholder="e.g. UPS, FedEx, USPS"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Box Dimensions (L x W x H)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={tempShipment.boxLength}
                onChange={(e) => setTempShipment(prev => ({ ...prev, boxLength: e.target.value }))}
                placeholder="L"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
              <input
                type="number"
                value={tempShipment.boxWidth}
                onChange={(e) => setTempShipment(prev => ({ ...prev, boxWidth: e.target.value }))}
                placeholder="W"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
              <input
                type="number"
                value={tempShipment.boxHeight}
                onChange={(e) => setTempShipment(prev => ({ ...prev, boxHeight: e.target.value }))}
                placeholder="H"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Return Carrier</label>
            <input
              type="text"
              value={tempShipment.returnShippingCarrier}
              onChange={(e) => setTempShipment(prev => ({ ...prev, returnShippingCarrier: e.target.value }))}
              placeholder="e.g. UPS Ground"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-amber-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsEditing(false)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
            <button onClick={handleSave} className="text-xs bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-3 py-1 rounded">Save</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Inbound Carrier</label>
            <div className="text-zinc-800 dark:text-zinc-200">{ticket.shippingCarrier || 'N/A'}</div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Box Dimensions</label>
            <div className="text-zinc-800 dark:text-zinc-200 font-mono text-sm">
              {ticket.boxLength || '?'}L x {ticket.boxWidth || '?'}W x {ticket.boxHeight || '?'}H
            </div>
          </div>
          {ticket.returnShippingCarrier && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 block">Return Carrier</label>
              <div className="text-zinc-800 dark:text-zinc-200">{ticket.returnShippingCarrier}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
