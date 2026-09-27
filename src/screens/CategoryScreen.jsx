import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES, ACCOUNTS } from '../constants';
import { ProgressBar } from '../components/ProgressBar';
import * as LucideIcons from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { cn } from '../utils/cn';

export function CategoryScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateCategoryBudgets } = useAuth();
  const { expenses, deleteExpense } = useExpense();
  const [filter, setFilter] = useState('All');
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newLimitVal, setNewLimitVal] = useState('');

  const category = CATEGORIES[id];
  if (!category) return <div className="p-6">Category not found</div>;

  const Icon = LucideIcons[category.icon];
  const limit = user.category_budgets[id] || category.defaultLimit;
  
  const categoryExpenses = expenses.filter(e => e.category === id);
  const filteredExpenses = filter === 'All' 
    ? categoryExpenses 
    : categoryExpenses.filter(e => e.account === filter);

  const spent = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const percentage = Math.round((spent / limit) * 100);

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
    return dayExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative pb-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md pt-6 px-6 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className={`text-${percentage >= 100 ? 'red' : percentage >= 85 ? 'amber' : 'emerald'}-500`}>
              {Icon && <Icon size={24} />}
            </div>
            <h1 className="text-xl font-medium text-zinc-100">{category.label}</h1>
          </div>
          <button className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <MoreVertical size={24} />
          </button>
        </div>

        {/* Category Budget Card */}
        <div className="bg-card rounded-2xl p-5 border border-zinc-800/80 shadow-lg mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-zinc-400 text-xs mb-1">Total Spent</div>
              <div className="text-2xl font-semibold text-zinc-100">₹ {spent.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div className="text-zinc-400 text-xs mb-1 flex items-center justify-end gap-1">
                Budget Limit
                <button className="text-zinc-500 hover:text-emerald-500 transition-colors" onClick={() => { setNewLimitVal(limit.toString()); setIsEditingLimit(true); }}>
                  <Edit2 size={10} />
                </button>
              </div>
              <div className="text-sm font-medium text-zinc-300">₹ {limit.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar spent={spent} limit={limit} className="flex-1 h-2" />
            <span className="text-xs text-zinc-400 font-medium">{percentage}%</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {['All', ...ACCOUNTS].map(acc => (
            <button
              key={acc}
              onClick={() => setFilter(acc)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                filter === acc
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800"
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
          <div className="text-center text-zinc-500 mt-10 text-sm">No expenses found for this selection.</div>
        ) : (
          Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a)).map(date => (
            <div key={date} className="mb-8">
              <div className="flex justify-between items-center text-xs text-zinc-400 mb-4 px-2">
                <span>{getDateLabel(date)}</span>
                <span>₹ {getDayTotal(grouped[date]).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col gap-1">
                {grouped[date].map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/50 group transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0 text-xs font-medium">
                        {expense.account.substring(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="text-sm font-medium text-zinc-100 truncate">
                          {expense.note || category.label}
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>{expense.account}</span>
                          <span>•</span>
                          <span>{format(new Date(expense.created_at), 'hh:mm a')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-zinc-300">- ₹ {parseFloat(expense.amount).toLocaleString('en-IN')}</span>
                      <button 
                        onClick={() => deleteExpense(expense.id)}
                        className="text-zinc-600 hover:text-red-500 p-2 -mr-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {isEditingLimit && (
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
                className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(newLimitVal) {
                    updateCategoryBudgets({ ...user.category_budgets, [id]: parseInt(newLimitVal) });
                    setIsEditingLimit(false);
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
