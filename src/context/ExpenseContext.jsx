import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { startOfMonth, endOfMonth, format, parseISO, isSameMonth, subMonths } from 'date-fns';

const ExpenseContext = createContext();

export function ExpenseProvider({ children }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async (monthDate) => {
    if (!user) return;
    setLoading(true);
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchExpenses(currentMonth);
    } else {
      setExpenses([]);
    }
  }, [user, currentMonth, fetchExpenses]);

  const addExpense = async (expenseData) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expenseData, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      // If the expense belongs to the currently viewed month, add it to state
      if (isSameMonth(parseISO(data.expense_date), currentMonth)) {
        // Sort effectively so newest is first
        setExpenses(prev => {
          const newExpenses = [data, ...prev];
          return newExpenses.sort((a, b) => {
            const dateDiff = new Date(b.expense_date) - new Date(a.expense_date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.created_at) - new Date(a.created_at);
          });
        });
      }
    }
    return { data, error };
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
    return { error };
  };

  const fetchFourMonthsExpenses = useCallback(async (monthDate) => {
    if (!user) return [];
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const startDate = format(startOfMonth(subMonths(monthDate, 3)), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);
    
    if (!error && data) {
      return data;
    }
    return [];
  }, [user]);

  return (
    <ExpenseContext.Provider value={{
      expenses,
      currentMonth,
      setCurrentMonth,
      addExpense,
      deleteExpense,
      fetchFourMonthsExpenses,
      loading
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpense = () => useContext(ExpenseContext);
