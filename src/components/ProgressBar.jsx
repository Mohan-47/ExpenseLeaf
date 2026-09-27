import React from 'react';
import { cn } from '../utils/cn';

export function ProgressBar({ spent, limit, className }) {
  const percentage = Math.min((spent / limit) * 100, 100) || 0;
  
  let colorClass = 'bg-emerald-500';
  if (percentage >= 100) {
    colorClass = 'bg-red-500';
  } else if (percentage >= 85) {
    colorClass = 'bg-amber-500';
  }

  return (
    <div className={cn("h-2 w-full bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div 
        className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
