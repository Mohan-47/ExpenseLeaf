import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES, ACCOUNTS } from '../constants';
import { ProgressBar } from '../components/ProgressBar';
import { AddExpenseSheet } from '../components/AddExpenseSheet';
import * as LucideIcons from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { cn } from '../utils/cn';
import { formatName } from '../utils/formatName';

export function CategoryScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, linkedUserProfile, viewMode, updateCategoryBudgets } = useAuth();
  const { expenses, deleteExpense, activeCategoryBudgets } = useExpense();
  const [filter, setFilter] = useState('All');
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newLimitVal, setNewLimitVal] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);

  const category = CATEGORIES[id];
  if (!category) return <div className="p-6 text-zinc-400">Category not found</div>;

  const isReadOnly = viewMode !== 'personal';
  const Icon = LucideIcons[category.icon];
  const limit = activeCategoryBudgets[id] || category.defaultLimit;

  const categoryExpenses = expenses.filter(e => e.category === id);
  const filteredExpenses = filter === 'All'
    ? categoryExpenses
    : categoryExpenses.filter(e => e.account === filter);

  const spent = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  const grouped = filteredExpenses.reduce((acc, expense) => {
    const date = expense.expense_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(expense);
    return acc;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today • ${format(date, 'dd MMM yyyy')}`;
    if (isYesterday(date)) return `Yesterday • ${format(date, 'dd MMM yyyy')}`;
    return format(date, 'dd MMM yyyy • EEE');
  };

  const getDayTotal = (dayExpenses) => {
    return dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  };

  const handleExpenseClick = (expense) => {
    if (!isReadOnly && expense.user_id === user?.id) {
      setEditingExpense(expense);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col relative pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md pt-5 px-6 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className={percentage >= 100 ? 'text-red-500' : percentage >= 85 ? 'text-amber-500' : 'text-emerald-500'}>
              {Icon && <Icon size={22} />}
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              {category.label}
              {isReadOnly && (
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md text-[10px] font-medium ml-1">
                  <Eye size={10} />
                  <span>Read-Only</span>
                </div>
              )}
            </h1>
          </div>
          <div className="w-8" />
        </div>



        {/* Category Budget Card */}
        <div className="bg-card rounded-2xl p-5 border border-zinc-800/80 shadow-lg mb-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-zinc-400 text-xs mb-1">Total Spent</div>
              <div className="text-2xl font-semibold text-zinc-100">₹ {Math.round(spent).toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div className="text-zinc-400 text-xs mb-1 flex items-center justify-end gap-1">
                <span>Budget Limit</span>
                {!isReadOnly && (
                  <button
                    className="text-zinc-500 hover:text-emerald-500 transition-colors"
                    onClick={() => {
                      setNewLimitVal(limit.toString());
                      setIsEditingLimit(true);
                    }}
                    title="Edit limit"
                  >
                    <Edit2 size={10} />
                  </button>
                )}
              </div>
              <div className="text-sm font-medium text-zinc-300">₹ {limit.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar spent={spent} limit={limit} className="flex-1 h-2" />
            <span className="text-xs text-zinc-400 font-medium">{percentage}%</span>
          </div>
        </div>

        {/* Payment Account Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', ...ACCOUNTS].map(acc => (
            <button
              key={acc}
              onClick={() => setFilter(acc)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                filter === acc
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              {acc}
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      <div className="px-6 py-4 flex-1">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center text-zinc-500 mt-12 text-sm">No expenses found for this selection.</div>
        ) : (
          Object.keys(grouped)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(date => (
              <div key={date} className="mb-6">
                <div className="flex justify-between items-center text-xs text-zinc-400 mb-3 px-1">
                  <span className="font-medium">{getDateLabel(date)}</span>
                  <span className="text-zinc-500 font-medium">₹ {Math.round(getDayTotal(grouped[date])).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {grouped[date].map(expense => {
                    const ownerUsername = expense.user_id === user?.id
                      ? user?.username
                      : linkedUserProfile?.username;

                    return (
                      <div
                        key={expense.id}
                        onClick={() => handleExpenseClick(expense)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl bg-card border border-zinc-800/40 hover:border-zinc-800 group transition-all",
                          (!isReadOnly && expense.user_id === user?.id) && "cursor-pointer hover:bg-zinc-900/50"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0 text-xs font-medium">
                            {expense.account?.substring(0, 3) || 'EXP'}
                          </div>
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-100 truncate">
                                {expense.note || category.label}
                              </span>
                              {viewMode === 'merged' && ownerUsername && (
                                <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {formatName(ownerUsername)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span>{expense.account}</span>
                              <span>•</span>
                              <span>{format(new Date(expense.created_at || expense.expense_date), 'hh:mm a')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-medium text-zinc-200">
                            - ₹ {parseFloat(expense.amount).toLocaleString('en-IN')}
                          </span>
                          {!isReadOnly && expense.user_id === user?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteExpense(expense.id);
                              }}
                              className="text-zinc-600 hover:text-red-400 p-1.5 -mr-1 transition-colors"
                              title="Delete expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Edit Limit Modal (Only in Personal view) */}
      {!isReadOnly && isEditingLimit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">Edit {category.label} Limit</h3>
            <div className="flex items-center gap-2 mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <span className="text-xl text-emerald-500 font-medium">₹</span>
              <input
                type="number"
                value={newLimitVal}
                onChange={(e) => setNewLimitVal(e.target.value)}
                className="w-full bg-transparent text-2xl text-zinc-100 outline-none font-medium"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditingLimit(false)}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newLimitVal) {
                    updateCategoryBudgets({ ...user.category_budgets, [id]: parseInt(newLimitVal) });
                    setIsEditingLimit(false);
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

      {/* Edit Expense Sheet */}
      <AddExpenseSheet
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expenseToEdit={editingExpense}
      />
    </div>
  );
}
