import React from 'react';
import { Lock } from 'lucide-react';

export default function RepairStatusCard({ ticket, technicians, onStatusChange, onTechnicianChange }) {
  const isClosed = ticket.status === 'closed';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
      {isClosed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
          <Lock size={13} className="shrink-0" />
          <span>This repair is closed. Change status below to reopen.</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">Assigned Technician</label>
        <select
          value={ticket.technician || 'Unassigned'}
          onChange={(e) => onTechnicianChange(e.target.value)}
          className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-lg focus:border-amber-500 outline-none text-sm"
        >
          <option value="Unassigned">Unassigned</option>
          {technicians.map(tech => (
            <option key={tech} value={tech}>{tech}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">Repair Status</label>
        <select
          value={ticket.status}
          onChange={(e) => onStatusChange(e.target.value)}
          title={isClosed ? "Repair status is closed — reopen to use this button" : undefined}
          className={`w-full border px-3 py-2 rounded-lg outline-none text-sm transition-colors ${
            isClosed
              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-pointer'
              : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:border-amber-500'
          }`}
        >
          <option value="queued">Queued</option>
          <option value="diagnosing">Diagnosing</option>
          <option value="estimate">Awaiting Estimate</option>
          <option value="parts">Waiting for Parts</option>
          <option value="shipping">Shipping</option>
          <option value="repairing">Repairing</option>
          <option value="testing">Testing</option>
          <option value="ready">Ready for Pickup</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
}
