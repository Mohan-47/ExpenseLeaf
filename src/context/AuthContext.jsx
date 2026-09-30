import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [linkedUserProfile, setLinkedUserProfile] = useState(null);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'connected' | 'merged'
  const [loading, setLoading] = useState(true);
  const [savedUsername, setSavedUsername] = useState(localStorage.getItem('expenseleaf_username') || '');

  const fetchLinkedProfile = useCallback(async (linkedUsername) => {
    if (!linkedUsername) {
      setLinkedUserProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, monthly_budget, category_budgets, linked_user, monthly_budgets')
        .eq('username', linkedUsername.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        setLinkedUserProfile(data);
      } else {
        setLinkedUserProfile(null);
      }
    } catch {
      setLinkedUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem('expenseleaf_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          if (parsed?.linked_user) {
            fetchLinkedProfile(parsed.linked_user);
          }
          const { data: freshUser } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', parsed.id)
            .maybeSingle();

          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('expenseleaf_user', JSON.stringify(freshUser));
            if (freshUser.linked_user) {
              fetchLinkedProfile(freshUser.linked_user);
            } else {
              setLinkedUserProfile(null);
            }
          }
        } catch {}
      }
      setLoading(false);
    };
    checkSession();
  }, [fetchLinkedProfile]);

  useEffect(() => {
    if (user?.linked_user) {
      fetchLinkedProfile(user.linked_user);
    } else {
      setLinkedUserProfile(null);
      setViewMode('personal');
    }
  }, [user?.linked_user, fetchLinkedProfile]);

  const getMonthBudget = useCallback(async (monthKey, targetUser, isLinked = false) => {
    if (!targetUser) return { monthly_budget: 0, category_budgets: {} };

    const existing = targetUser.monthly_budgets?.[monthKey];
    if (existing) {
      return {
        monthly_budget: existing.monthly_budget ?? targetUser.monthly_budget ?? 0,
        category_budgets: existing.category_budgets ?? targetUser.category_budgets ?? {}
      };
    }

    const base = {
      monthly_budget: targetUser.monthly_budget ?? 0,
      category_budgets: targetUser.category_budgets ?? {}
    };

    if (!isLinked && targetUser.id) {
      try {
        const currentMonthlyBudgets = targetUser.monthly_budgets || {};
        const updated = {
          ...currentMonthlyBudgets,
          [monthKey]: { monthly_budget: base.monthly_budget, category_budgets: base.category_budgets }
        };
        const { data: freshUser } = await supabase
          .from('app_users')
          .update({ monthly_budgets: updated })
          .eq('id', targetUser.id)
          .select()
          .single();

        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('expenseleaf_user', JSON.stringify(freshUser));
        }
      } catch {}
    }

    return base;
  }, []);

  const updateMonthBudget = useCallback(async (monthKey, newMonthlyBudget, newCategoryBudgets) => {
    if (!user) return { success: false };
    try {
      const currentMonthlyBudgets = user.monthly_budgets || {};
      const updated = {
        ...currentMonthlyBudgets,
        [monthKey]: {
          monthly_budget: newMonthlyBudget,
          category_budgets: newCategoryBudgets
        }
      };

      const { data, error } = await supabase
        .from('app_users')
        .update({
          monthly_budgets: updated,
          monthly_budget: newMonthlyBudget,
          category_budgets: newCategoryBudgets
        })
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        setUser(data);
        localStorage.setItem('expenseleaf_user', JSON.stringify(data));
        return { success: true };
      }
      return { success: false, error };
    } catch (e) {
      return { success: false, error: e };
    }
  }, [user]);

  const login = async (username, pin) => {
    try {
      const cleaned = username.trim().toLowerCase();
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', cleaned)
        .eq('pin', pin)
        .maybeSingle();

      if (error || !data) return { success: false, error: 'Invalid username or PIN' };

      setUser(data);
      localStorage.setItem('expenseleaf_user', JSON.stringify(data));
      localStorage.setItem('expenseleaf_username', data.username);
      setSavedUsername(data.username);

      if (data.linked_user) {
        await fetchLinkedProfile(data.linked_user);
      } else {
        setLinkedUserProfile(null);
        setViewMode('personal');
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const createAccount = async (rawUsername, pin) => {
    try {
      const cleaned = rawUsername.toLowerCase().trim().replace(/\s+/g, '');
      if (!cleaned) return { success: false, error: 'Please enter a valid username' };
      if (!pin || pin.length !== 4) return { success: false, error: 'PIN must be 4 digits' };

      const { data: existingUser } = await supabase.from('app_users').select('id').eq('username', cleaned).maybeSingle();
      if (existingUser) return { success: false, error: 'Username already taken' };

      const defaultCategoryBudgets = { FOOD: 10000, TRAVEL: 8000, HOSTEL: 10000, PARTIES: 5000, CLOTHES: 5000, SAVINGS: 5000, OTHERS: 10000 };

      const { data: newUser, error: insertError } = await supabase
        .from('app_users')
        .insert([{ username: cleaned, pin, monthly_budget: 30000, category_budgets: defaultCategoryBudgets, monthly_budgets: {}, linked_user: null }])
        .select()
        .single();

      if (insertError || !newUser) return { success: false, error: insertError?.message || 'Failed to create account' };

      setUser(newUser);
      setLinkedUserProfile(null);
      setViewMode('personal');
      localStorage.setItem('expenseleaf_user', JSON.stringify(newUser));
      localStorage.setItem('expenseleaf_username', newUser.username);
      setSavedUsername(newUser.username);
      return { success: true, user: newUser };
    } catch {
      return { success: false, error: 'Account creation failed. Please try again.' };
    }
  };

  const connectUser = async (rawTargetUsername) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const target = rawTargetUsername.toLowerCase().trim().replace(/\s+/g, '');

    if (!target) return { success: false, error: 'Please enter a username to connect' };
    if (target === user.username.toLowerCase().trim()) return { success: false, error: 'Cannot connect to your own account' };

    try {
      const { data: targetProfile, error: findError } = await supabase
        .from('app_users')
        .select('id, username, monthly_budget, category_budgets, linked_user, monthly_budgets')
        .eq('username', target)
        .maybeSingle();

      if (findError || !targetProfile) return { success: false, error: 'User not found' };

      const { error: updateError } = await supabase.from('app_users').update({ linked_user: targetProfile.username }).eq('id', user.id);
      if (updateError) return { success: false, error: 'Failed to connect account' };

      const updatedUser = { ...user, linked_user: targetProfile.username };
      setUser(updatedUser);
      setLinkedUserProfile(targetProfile);
      localStorage.setItem('expenseleaf_user', JSON.stringify(updatedUser));
      return { success: true, linkedUser: targetProfile };
    } catch {
      return { success: false, error: 'Error connecting account' };
    }
  };

  const disconnectUser = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const { error } = await supabase.from('app_users').update({ linked_user: null }).eq('id', user.id);
      if (error) return { success: false, error: 'Failed to disconnect account' };

      const updatedUser = { ...user, linked_user: null };
      setUser(updatedUser);
      setLinkedUserProfile(null);
      setViewMode('personal');
      localStorage.setItem('expenseleaf_user', JSON.stringify(updatedUser));
      return { success: true };
    } catch {
      return { success: false, error: 'Error disconnecting account' };
    }
  };

  const updatePin = async (newPin) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return { success: false, error: 'PIN must be exactly 4 digits' };

    try {
      const { error } = await supabase.from('app_users').update({ pin: newPin }).eq('id', user.id);
      if (error) return { success: false, error: 'Failed to update PIN' };

      const updatedUser = { ...user, pin: newPin };
      setUser(updatedUser);
      localStorage.setItem('expenseleaf_user', JSON.stringify(updatedUser));
      return { success: true };
    } catch {
      return { success: false, error: 'Error updating PIN' };
    }
  };

  const logout = () => {
    setUser(null);
    setLinkedUserProfile(null);
    setViewMode('personal');
    localStorage.removeItem('expenseleaf_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user, linkedUserProfile, viewMode, setViewMode, savedUsername, setSavedUsername,
        login, createAccount, connectUser, disconnectUser, updatePin, logout,
        getMonthBudget, updateMonthBudget, loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
