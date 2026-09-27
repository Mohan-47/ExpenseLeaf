import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants';
import { ProgressBar } from '../components/ProgressBar';
import * as LucideIcons from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function DashboardScreen() {
  const { user, logout, updateMonthlyBudget } = useAuth();
  const { expenses, currentMonth, setCurrentMonth } = useExpense();
  const navigate = useNavigate();
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState('');

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthlyBudget = user.monthly_budget;
  const remaining = monthlyBudget - totalSpent;
  const overBudget = remaining < 0;

  const categoryTotals = Object.keys(CATEGORIES).reduce((acc, catId) => {
    acc[catId] = expenses
      .filter(e => e.category === catId)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return acc;
  }, {});

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4 bg-zinc-900/50 rounded-full px-4 py-2 border border-zinc-800">
          <button onClick={prevMonth} className="text-zinc-400 hover:text-zinc-100"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium w-28 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="text-zinc-400 hover:text-zinc-100"><ChevronRight size={18} /></button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            {user.username}
          </div>
          <button onClick={logout} className="text-zinc-500 hover:text-red-400"><LogOut size={18} /></button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-card rounded-3xl p-6 mb-8 border border-zinc-800/80 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div className="text-zinc-400 text-sm flex items-center gap-2 mb-1">
              Monthly Budget 
              <button className="text-zinc-500 hover:text-emerald-500 transition-colors" onClick={() => { setNewBudgetVal(monthlyBudget.toString()); setIsEditingBudget(true); }}>
                <Edit2 size={12} />
              </button>
            </div>
            <div className="text-xl font-semibold">₹ {monthlyBudget.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-zinc-950 px-3 py-1 rounded-full text-xs font-medium border border-zinc-800 text-zinc-300">
            {Math.min(Math.round((totalSpent / monthlyBudget) * 100), 100)}%
          </div>
        </div>

        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <div className="text-zinc-400 text-sm mb-1">Total Spent</div>
            <div className="text-3xl font-semibold text-zinc-100">₹ {totalSpent.toLocaleString('en-IN')}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-sm mb-1">Remaining</div>
            <div className={`text-xl font-medium ${overBudget ? 'text-red-500' : 'text-emerald-500'}`}>
              {overBudget ? '-' : ''}₹ {Math.abs(remaining).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <ProgressBar spent={totalSpent} limit={monthlyBudget} className="h-2.5 relative z-10" />
      </div>

      {/* Categories List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-zinc-100">Categories</h3>
          <button className="text-xs text-emerald-500 hover:underline">View All &gt;</button>
        </div>

        <div className="flex flex-col gap-3">
          {Object.values(CATEGORIES).map(cat => {
            const Icon = LucideIcons[cat.icon];
            const limit = user.category_budgets[cat.id] || cat.defaultLimit;
            const spent = categoryTotals[cat.id] || 0;
            const percentage = Math.round((spent / limit) * 100);
            
            return (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/category/${cat.id}`)}
                className="bg-card p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform ${percentage >= 100 ? 'text-red-500' : percentage >= 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {Icon && <Icon size={24} />}
                </div>
                
                <div className="flex-1 min-w-0 pr-6 relative">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-zinc-100 truncate">{cat.label}</h4>
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{percentage}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-zinc-300 font-medium">₹ {spent.toLocaleString('en-IN')}</span>
                    <span className="text-zinc-500 text-xs">/ ₹ {limit.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <ProgressBar spent={spent} limit={limit} />
                  
                  {percentage >= 85 && percentage < 100 && (
                    <AlertCircle size={14} className="text-amber-500 absolute -right-6 top-1/2 -translate-y-1/2" />
                  )}
                  {percentage >= 100 && (
                    <AlertCircle size={14} className="text-red-500 absolute -right-6 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isEditingBudget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">Edit Monthly Budget</h3>
            <div className="flex items-center gap-2 mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <span className="text-xl text-emerald-500 font-medium">₹</span>
              <input
                type="number"
                value={newBudgetVal}
                onChange={(e) => setNewBudgetVal(e.target.value)}
                className="w-full bg-transparent text-2xl text-zinc-100 outline-none font-medium"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditingBudget(false)}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(newBudgetVal) {
                    updateMonthlyBudget(parseInt(newBudgetVal));
                    setIsEditingBudget(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
