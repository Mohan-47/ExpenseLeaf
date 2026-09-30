import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { CATEGORIES } from '../constants';
import { startOfMonth, endOfMonth, format, parseISO, isSameMonth, subMonths } from 'date-fns';

const ExpenseContext = createContext();

export function ExpenseProvider({ children }) {
  const { user, linkedUserProfile, viewMode, getMonthBudget, updateMonthBudget } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [activeMonthlyBudget, setActiveMonthlyBudget] = useState(0);
  const [activeCategoryBudgets, setActiveCategoryBudgets] = useState({});

  useEffect(() => {
    const fetchBudgets = async () => {
      const monthKey = format(currentMonth, 'yyyy-MM');
      
      let uBudget = 0, uCat = {};
      let lBudget = 0, lCat = {};

      if (user) {
        const u = await getMonthBudget(monthKey, user, false);
        uBudget = u.monthly_budget;
        uCat = u.category_budgets;
      }

      if (linkedUserProfile) {
        const l = await getMonthBudget(monthKey, linkedUserProfile, true);
        lBudget = l.monthly_budget;
        lCat = l.category_budgets;
      }

      let finalBudget = 0;
      let finalCat = {};

      if (viewMode === 'connected') {
        finalBudget = lBudget;
        finalCat = lCat;
      } else if (viewMode === 'merged') {
        finalBudget = uBudget + lBudget;
        Object.values(CATEGORIES).forEach(cat => {
          finalCat[cat.id] = (uCat[cat.id] ?? cat.defaultLimit) + (lCat[cat.id] ?? cat.defaultLimit);
        });
      } else {
        finalBudget = uBudget;
        finalCat = uCat;
      }

      if (viewMode !== 'merged') {
         Object.values(CATEGORIES).forEach(cat => {
           finalCat[cat.id] = finalCat[cat.id] ?? cat.defaultLimit;
         });
      }

      setActiveMonthlyBudget(finalBudget);
      setActiveCategoryBudgets(finalCat);
    };

    fetchBudgets();
  }, [user, linkedUserProfile, viewMode, currentMonth, getMonthBudget]);

  const updateMonthlyBudget = async (newAmount) => {
    if (!user) return;
    const monthKey = format(currentMonth, 'yyyy-MM');
    const u = await getMonthBudget(monthKey, user, false);
    await updateMonthBudget(monthKey, newAmount, u.category_budgets);
    // After update, update locally if viewMode is personal or merged
    if (viewMode === 'personal' || viewMode === 'merged') {
      const linkedAmt = viewMode === 'merged' ? (activeMonthlyBudget - u.monthly_budget) : 0;
      setActiveMonthlyBudget(newAmount + linkedAmt);
    }
  };

  const updateCategoryBudgets = async (newCatBudgets) => {
    if (!user) return;
    const monthKey = format(currentMonth, 'yyyy-MM');
    const u = await getMonthBudget(monthKey, user, false);
    await updateMonthBudget(monthKey, u.monthly_budget, newCatBudgets);
    
    // Optimistic local update
    if (viewMode === 'personal') {
      setActiveCategoryBudgets(newCatBudgets);
    } else if (viewMode === 'merged') {
      const mergedCat = {};
      const l = await getMonthBudget(monthKey, linkedUserProfile, true);
      Object.values(CATEGORIES).forEach(cat => {
        mergedCat[cat.id] = (newCatBudgets[cat.id] ?? cat.defaultLimit) + (l.category_budgets[cat.id] ?? cat.defaultLimit);
      });
      setActiveCategoryBudgets(mergedCat);
    }
  };


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
        updateMonthlyBudget,
        updateCategoryBudgets,
        loading
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpense = () => useContext(ExpenseContext);
