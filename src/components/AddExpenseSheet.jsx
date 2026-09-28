import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { CATEGORIES, ACCOUNTS } from '../constants';
import { cn } from '../utils/cn';
import * as LucideIcons from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { format } from 'date-fns';

export function AddExpenseSheet({ isOpen, onClose, expenseToEdit }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [account, setAccount] = useState('UPI');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const inputRef = useRef(null);
  const { addExpense, updateExpense, loading } = useExpense();

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setAmount(expenseToEdit.amount?.toString() || '');
        setCategory(expenseToEdit.category);
        setAccount(expenseToEdit.account || 'UPI');
        setNote(expenseToEdit.note || '');
        setDate(expenseToEdit.expense_date ? format(new Date(expenseToEdit.expense_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      } else {
        setAmount('');
        setCategory(null);
        setAccount('UPI');
        setNote('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, expenseToEdit]);

  const handleSave = async () => {
    if (!amount || !category || !account) return;
    
    const payload = {
      amount: parseFloat(amount),
      category: category,
      account: account,
      note: note.trim(),
      expense_date: date
    };

    if (expenseToEdit && updateExpense) {
      await updateExpense(expenseToEdit.id, payload);
    } else {
      await addExpense(payload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card rounded-t-3xl z-50 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-zinc-100">{expenseToEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-2 -m-2 text-zinc-400 hover:text-zinc-200"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-2 mb-8 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
          <span className="text-2xl text-emerald-500 font-medium">₹</span>
          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-4xl text-zinc-100 placeholder-zinc-600 outline-none font-medium"
            placeholder="0"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-sm text-zinc-400 mb-3">Select Category</h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.values(CATEGORIES).map((cat) => {
              const Icon = LucideIcons[cat.icon];
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2",
                    isSelected 
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  {Icon && <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} />}
                  <span className="text-[10px] leading-tight text-center">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm text-zinc-400 mb-3">Payment Account</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {ACCOUNTS.map((acc) => (
              <button
                key={acc}
                onClick={() => setAccount(acc)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                  account === acc
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800"
                )}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <div className="flex-1 bg-zinc-900/80 rounded-xl px-4 py-3 border border-zinc-800/80 flex items-center">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="bg-transparent w-full outline-none text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div className="bg-zinc-900/80 rounded-xl px-4 py-3 border border-zinc-800/80 flex items-center gap-2 text-zinc-300 min-w-36">
            <CalendarIcon size={16} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent w-full outline-none text-sm text-zinc-100 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || !category || !account || loading}
          className="w-full bg-emerald-500 text-zinc-950 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : expenseToEdit ? 'Save Changes' : 'Save Expense'}
        </button>
      </div>
    </>
  );
}
