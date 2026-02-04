import React, { useEffect, useState } from 'react';
import { getRepairs } from '@/lib/api';
import { Activity, Clock, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none transition-colors duration-200">
    <div>
      <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg bg-${color}-500/10 text-${color}-600 dark:text-${color}-500`}>
      <Icon size={24} />
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    waiting: 0,
    ready: 0
  });
  const [recentRepairs, setRecentRepairs] = useState([]);

  useEffect(() => {
    getRepairs().then(repairs => {
      // Calculate Stats
      const activeRepairs = repairs.filter(r => r.status !== 'closed');
      
      setStats({
        total: activeRepairs.length,
        inProgress: repairs.filter(r => ['diagnosing', 'repairing'].includes(r.status)).length,
        waiting: repairs.filter(r => ['queued', 'parts', 'estimate'].includes(r.status)).length,
        ready: repairs.filter(r => r.status === 'ready').length
      });

      // Get Recent Activity (Already sorted by backend)
      setRecentRepairs(repairs.slice(0, 3));
    }).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Shop Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Jobs" value={stats.total} icon={Activity} color="blue" />
        <StatCard title="On Bench" value={stats.inProgress} icon={Wrench} color="amber" />
        <StatCard title="Waiting" value={stats.waiting} icon={Clock} color="zinc" />
        <StatCard title="Ready for Pickup" value={stats.ready} icon={CheckCircle2} color="green" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-200">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Recent Activity</h3>
        </div>
        
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {recentRepairs.map(ticket => (
            <Link 
              to={`/repair/${ticket.id}`} 
              key={ticket.id}
              className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-500 dark:text-zinc-400 group-hover:bg-amber-500/10 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                  <Activity size={20} />
                </div>
                <div>
                  <h4 className="text-zinc-900 dark:text-white font-medium group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                    New Intake: {ticket.brand} {ticket.model}
                  </h4>
                  <p className="text-sm text-zinc-500">
                    Client: {ticket.clientName} • {new Date(ticket.dateIn).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  #{ticket.claimNumber || ticket.id}
                </span>
              </div>
            </Link>
          ))}

          {recentRepairs.length === 0 && (
            <div className="text-zinc-500 text-sm text-center py-8">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
