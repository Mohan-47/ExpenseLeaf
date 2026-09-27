import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedUsername, setSavedUsername] = useState(localStorage.getItem('expenseleaf_username') || '');

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem('expenseleaf_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (username, pin) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('pin', pin)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid username or PIN' };
      }

      setUser(data);
      localStorage.setItem('expenseleaf_user', JSON.stringify(data));
      localStorage.setItem('expenseleaf_username', data.username);
      setSavedUsername(data.username);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('expenseleaf_user');
  };

  const updateMonthlyBudget = async (newMonthlyBudget) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('app_users')
      .update({ monthly_budget: newMonthlyBudget })
      .eq('id', user.id)
      .select()
      .single();
    
    if (data) {
      setUser(data);
      localStorage.setItem('expenseleaf_user', JSON.stringify(data));
    }
  };

  const updateCategoryBudgets = async (newCategoryBudgets) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('app_users')
      .update({ category_budgets: newCategoryBudgets })
      .eq('id', user.id)
      .select()
      .single();
    
    if (data) {
      setUser(data);
      localStorage.setItem('expenseleaf_user', JSON.stringify(data));
    }
  };

  return (
    <AuthContext.Provider value={{ user, savedUsername, login, logout, updateMonthlyBudget, updateCategoryBudgets, setSavedUsername, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
