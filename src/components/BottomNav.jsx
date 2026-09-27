import React from 'react';
import { Home, PieChart, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

export function BottomNav({ onAddExpenseClick }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/80 backdrop-blur-md border-t border-zinc-800/80 px-8 py-3 flex justify-between items-center z-40 rounded-t-2xl">
      <NavLink to="/" className={({ isActive }) => cn("flex flex-col items-center gap-1 text-xs transition-colors", isActive ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
        <Home size={24} />
        <span>Dashboard</span>
      </NavLink>
      
      <div className="relative -top-6">
        <button 
          onClick={onAddExpenseClick}
          className="w-14 h-14 bg-emerald-500 text-zinc-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={32} />
        </button>
        <div className="text-xs text-center mt-1 text-zinc-500">Add</div>
      </div>

      <NavLink to="/analytics" className={({ isActive }) => cn("flex flex-col items-center gap-1 text-xs transition-colors", isActive ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
        <PieChart size={24} />
        <span>Analytics</span>
      </NavLink>
    </div>
  );
}
