import React from 'react';
import { cn } from '../utils/cn';

export function ProgressBar({ spent, limit, segments, className }) {
  if (segments && segments.length > 0) {
    const totalSpent = segments.reduce((sum, s) => sum + s.value, 0);
    return (
      <div className={cn("h-2 w-full bg-zinc-800 rounded-full flex overflow-hidden", className)}>
        {segments.map((seg, i) => {
          let pct = limit > 0 ? (seg.value / limit) * 100 : 0;
          if (totalSpent > limit) {
             pct = (seg.value / totalSpent) * 100;
          }
          return (
            <div 
              key={i}
              className={cn("h-full transition-all duration-500 ease-out flex-shrink-0", seg.colorClass)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
    );
  }

  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  
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
