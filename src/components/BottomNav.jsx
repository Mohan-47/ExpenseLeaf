import React from 'react';
import { Home, PieChart, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export function BottomNav({ onAddExpenseClick }) {
  const { viewMode } = useAuth();
  const isPersonal = viewMode === 'personal';

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/90 backdrop-blur-md border-t border-zinc-800/80 py-3 z-40 rounded-t-2xl transition-all",
        isPersonal ? "px-8 flex justify-between items-center" : "px-12 flex justify-around items-center"
      )}
    >
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
          )
        }
      >
        <Home size={22} />
        <span>Dashboard</span>
      </NavLink>

      {isPersonal && (
        <div className="relative -top-6">
          <button
            onClick={onAddExpenseClick}
            className="w-14 h-14 bg-emerald-500 text-zinc-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform"
            aria-label="Add Expense"
          >
            <Plus size={30} />
          </button>
          <div className="text-[11px] text-center mt-1 text-zinc-500 font-medium">Add</div>
        </div>
      )}

      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
          )
        }
      >
        <PieChart size={22} />
        <span>Analytics</span>
      </NavLink>
    </div>
  );
}
