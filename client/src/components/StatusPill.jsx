import React from 'react';

const StatusPill = ({ status, className = '' }) => {
  // Define colors for each status
  const statusColors = {
    Submitted: 'bg-slate-100 text-slate-800',
    Acknowledged: 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-amber-100 text-amber-800',
    Resolved: 'bg-green-100 text-green-800',
    Rejected: 'bg-rose-100 text-rose-800'
  };

  const bgColor = statusColors[status] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${className}`}
    >
      {status}
    </span>
  );
};

export default StatusPill;