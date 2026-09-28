import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, ChevronDown, Leaf, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants';
import { ProgressBar } from '../components/ProgressBar';
import { AccountSettingsModal } from '../components/AccountSettingsModal';
import * as LucideIcons from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { formatName } from '../utils/formatName';

export function DashboardScreen() {
  const { user, linkedUserProfile, viewMode, setViewMode, updateMonthlyBudget } = useAuth();
  const { expenses, currentMonth, setCurrentMonth, activeMonthlyBudget, activeCategoryBudgets } = useExpense();
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState('');

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const monthlyBudget = activeMonthlyBudget || 0;
  const remaining = monthlyBudget - totalSpent;
  const overBudget = remaining < 0;

  const categoryTotals = Object.keys(CATEGORIES).reduce((acc, catId) => {
    acc[catId] = expenses
      .filter(e => e.category === catId)
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return acc;
  }, {});

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const isReadOnly = viewMode !== 'personal';
  const isMerged = viewMode === 'merged' && linkedUserProfile;
  
  const userSpent = expenses.filter(e => e.user_id === user?.id).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const connectedSpent = expenses.filter(e => e.user_id === linkedUserProfile?.id).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="p-6 pb-28">
      {/* Row 1: Top App Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Leaf size={18} className="text-zinc-950 stroke-[2.4]" />
          </div>
          <span className="text-lg font-semibold text-zinc-100 tracking-tight">ExpenseLeaf</span>
        </div>

        {/* Profile Chip */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-[#18181B] hover:bg-zinc-800 border border-zinc-800 rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-zinc-200 transition-all active:scale-95 shadow-sm"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
            {user?.username ? formatName(user.username).charAt(0) : 'U'}
          </div>
          <span className="max-w-[100px] truncate">{formatName(user?.username)}</span>
          <ChevronDown size={14} className="text-zinc-400" />
        </button>
      </div>

      {/* 3-Way Segmented Pill Switcher (If connected account exists) */}
      {linkedUserProfile && (
        <div className="flex bg-[#18181B] p-1 rounded-xl border border-zinc-800 mb-4 shadow-sm">
          <button
            onClick={() => setViewMode('personal')}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all text-center",
              viewMode === 'personal'
                ? "bg-emerald-500 text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Personal
          </button>
          <button
            onClick={() => setViewMode('connected')}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all text-center truncate px-2 flex items-center justify-center gap-1.5",
              viewMode === 'connected'
                ? "bg-emerald-500 text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
              viewMode === 'connected' ? "bg-zinc-950/10" : "bg-emerald-500/10 text-emerald-400"
            )}>
              {formatName(linkedUserProfile.username).charAt(0)}
            </div>
            {formatName(linkedUserProfile.username)}
          </button>
          <button
            onClick={() => setViewMode('merged')}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all text-center",
              viewMode === 'merged'
                ? "bg-emerald-500 text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Merged
          </button>
        </div>
      )}



      {/* Row 2: Month Selector in its own clean, centered full-width bar */}
      <div className="flex items-center justify-center gap-4 bg-[#18181B] border border-zinc-800/80 rounded-2xl py-2 px-4 mb-6 shadow-sm">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Previous Month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-zinc-200 min-w-36 text-center select-none">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Next Month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Monthly Budget Hero Card */}
      <div className="bg-card rounded-3xl p-6 mb-8 border border-zinc-800/80 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div className="text-zinc-400 text-xs flex items-center gap-2 mb-1">
              <span>Monthly Budget</span>
              {isReadOnly && (
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
                  <Eye size={10} />
                  <span>Read-Only</span>
                </div>
              )}
              {!isReadOnly && (
                <button
                  className="text-zinc-500 hover:text-emerald-500 transition-colors"
                  onClick={() => {
                    setNewBudgetVal(monthlyBudget.toString());
                    setIsEditingBudget(true);
                  }}
                  title="Edit monthly budget"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
            <div className="text-xl font-semibold text-zinc-100">
              ₹ {monthlyBudget.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-zinc-950 px-3 py-1 rounded-full text-xs font-medium border border-zinc-800 text-zinc-300">
            {monthlyBudget > 0 ? Math.min(Math.round((totalSpent / monthlyBudget) * 100), 100) : 0}%
          </div>
        </div>

        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <div className="text-zinc-400 text-xs mb-1">Total Spent</div>
            <div className="text-3xl font-semibold text-zinc-100">
              ₹ {Math.round(totalSpent).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-xs mb-1">Remaining</div>
            <div className={`text-xl font-medium ${overBudget ? 'text-red-500' : 'text-emerald-500'}`}>
              {overBudget ? '-' : ''}₹ {Math.abs(Math.round(remaining)).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <ProgressBar 
          spent={totalSpent} 
          limit={monthlyBudget} 
          segments={isMerged ? [
            { value: userSpent, colorClass: 'bg-emerald-500' },
            { value: connectedSpent, colorClass: 'bg-cyan-500' }
          ] : undefined}
          className="h-2.5 relative z-10" 
        />

        {isMerged && (
          <div className="flex justify-center items-center gap-4 mt-4 text-[10px] text-zinc-400 font-medium relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{formatName(user.username)}: ₹{Math.round(userSpent).toLocaleString('en-IN')} ({monthlyBudget > 0 ? Math.round((userSpent / monthlyBudget) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>{formatName(linkedUserProfile.username)}: ₹{Math.round(connectedSpent).toLocaleString('en-IN')} ({monthlyBudget > 0 ? Math.round((connectedSpent / monthlyBudget) * 100) : 0}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-zinc-100 text-sm">Categories</h3>
          <span className="text-xs text-zinc-500">Tap to view details</span>
        </div>

        <div className="flex flex-col gap-3">
          {Object.values(CATEGORIES).map((cat) => {
            const Icon = LucideIcons[cat.icon];
            const limit = activeCategoryBudgets[cat.id] || cat.defaultLimit;
            const spent = categoryTotals[cat.id] || 0;
            const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

            const catUserSpent = expenses.filter(e => e.category === cat.id && e.user_id === user?.id).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const catConnectedSpent = expenses.filter(e => e.category === cat.id && e.user_id === linkedUserProfile?.id).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/category/${cat.id}`)}
                className="bg-card p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors group"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform ${
                    percentage >= 100 ? 'text-red-500' : percentage >= 85 ? 'text-amber-500' : 'text-emerald-500'
                  }`}
                >
                  {Icon && <Icon size={24} />}
                </div>

                <div className="flex-1 min-w-0 pr-2 relative">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-zinc-100 text-sm truncate">{cat.label}</h4>
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {percentage}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-2 text-xs">
                    <span className="text-zinc-300 font-medium">₹ {Math.round(spent).toLocaleString('en-IN')}</span>
                    <span className="text-zinc-500">/ ₹ {limit.toLocaleString('en-IN')}</span>
                  </div>

                  <ProgressBar 
                    spent={spent} 
                    limit={limit} 
                    segments={isMerged ? [
                      { value: catUserSpent, colorClass: 'bg-emerald-500' },
                      { value: catConnectedSpent, colorClass: 'bg-cyan-500' }
                    ] : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Edit Budget Modal (Only in Personal view) */}
      {!isReadOnly && isEditingBudget && (
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
                className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newBudgetVal) {
                    updateMonthlyBudget(parseInt(newBudgetVal));
                    setIsEditingBudget(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors text-sm"
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
