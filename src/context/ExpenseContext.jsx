import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { CATEGORIES } from '../constants';
import { startOfMonth, endOfMonth, format, parseISO, isSameMonth, subMonths } from 'date-fns';

const ExpenseContext = createContext();

export function ExpenseProvider({ children }) {
  const { user, linkedUserProfile, viewMode } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Compute active monthly budget based on viewMode
  const activeMonthlyBudget = useMemo(() => {
    const userBudget = user?.monthly_budget || 0;
    const linkedBudget = linkedUserProfile?.monthly_budget || 0;

    if (viewMode === 'connected') {
      return linkedBudget;
    }
    if (viewMode === 'merged') {
      return userBudget + linkedBudget;
    }
    return userBudget;
  }, [user?.monthly_budget, linkedUserProfile?.monthly_budget, viewMode]);

  // Compute active category budgets based on viewMode
  const activeCategoryBudgets = useMemo(() => {
    const budgets = {};
    Object.values(CATEGORIES).forEach(cat => {
      const userLimit = user?.category_budgets?.[cat.id] ?? user?.category_budgets?.[cat.label] ?? cat.defaultLimit;
      const linkedLimit = linkedUserProfile?.category_budgets?.[cat.id] ?? linkedUserProfile?.category_budgets?.[cat.label] ?? cat.defaultLimit;

      if (viewMode === 'connected') {
        budgets[cat.id] = linkedLimit;
      } else if (viewMode === 'merged') {
        budgets[cat.id] = userLimit + linkedLimit;
      } else {
        budgets[cat.id] = userLimit;
      }
    });
    return budgets;
  }, [user?.category_budgets, linkedUserProfile?.category_budgets, viewMode]);

  const fetchExpenses = useCallback(async (monthDate) => {
    if (!user) return;
    setLoading(true);
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');

    let query = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (viewMode === 'personal') {
      query = query.eq('user_id', user.id);
    } else if (viewMode === 'connected') {
      if (linkedUserProfile) {
        query = query.eq('user_id', linkedUserProfile.id);
      } else {
        setExpenses([]);
        setLoading(false);
        return;
      }
    } else if (viewMode === 'merged') {
      if (linkedUserProfile) {
        query = query.in('user_id', [user.id, linkedUserProfile.id]);
      } else {
        query = query.eq('user_id', user.id);
      }
    }

    query = query
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      setExpenses(data);
    } else {
      setExpenses([]);
    }
    setLoading(false);
  }, [user, linkedUserProfile, viewMode]);

  useEffect(() => {
    if (user) {
      fetchExpenses(currentMonth);
    } else {
      setExpenses([]);
    }
  }, [user, currentMonth, viewMode, linkedUserProfile, fetchExpenses]);

  const addExpense = async (expenseData) => {
    if (!user || viewMode !== 'personal') return { error: 'Adding expenses is only allowed in Personal view' };

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expenseData, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      if (isSameMonth(parseISO(data.expense_date), currentMonth)) {
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
    if (viewMode !== 'personal') return { error: 'Deleting is not allowed in Read-Only mode' };

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
    return { error };
  };

  const updateExpense = async (id, updatedFields) => {
    if (viewMode !== 'personal') return { error: 'Editing is not allowed in Read-Only mode' };

    const { data, error } = await supabase
      .from('expenses')
      .update(updatedFields)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setExpenses(prev => {
        const otherExpenses = prev.filter(e => e.id !== id);
        if (isSameMonth(parseISO(data.expense_date), currentMonth)) {
          const newExpenses = [data, ...otherExpenses];
          return newExpenses.sort((a, b) => {
            const dateDiff = new Date(b.expense_date) - new Date(a.expense_date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.created_at) - new Date(a.created_at);
          });
        }
        return otherExpenses;
      });
    }
    return { data, error };
  };

  const fetchFourMonthsExpenses = useCallback(async (monthDate) => {
    if (!user) return [];
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const startDate = format(startOfMonth(subMonths(monthDate, 3)), 'yyyy-MM-dd');

    let query = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (viewMode === 'personal') {
      query = query.eq('user_id', user.id);
    } else if (viewMode === 'connected') {
      if (linkedUserProfile) {
        query = query.eq('user_id', linkedUserProfile.id);
      } else {
        return [];
      }
    } else if (viewMode === 'merged') {
      if (linkedUserProfile) {
        query = query.in('user_id', [user.id, linkedUserProfile.id]);
      } else {
        query = query.eq('user_id', user.id);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      return data;
    }
    return [];
  }, [user, linkedUserProfile, viewMode]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        currentMonth,
        setCurrentMonth,
        addExpense,
        updateExpense,
        deleteExpense,
        fetchFourMonthsExpenses,
        activeMonthlyBudget,
        activeCategoryBudgets,
        loading
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpense = () => useContext(ExpenseContext);
