import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants';
import { format, subMonths, isSameMonth, parseISO, isWeekend, getDaysInMonth, getDate, addMonths } from 'date-fns';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Lightbulb, ChevronRight, Save, AlertCircle, Sparkles, Eye, Lock, ChevronLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../utils/cn';
import { formatName } from '../utils/formatName';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6B7280'];

export function AnalyticsScreen() {
  const [tab, setTab] = useState('Monthly');
  const { user, linkedUserProfile, viewMode, setViewMode, getMonthBudget } = useAuth();
  const { expenses, currentMonth, setCurrentMonth, fetchFourMonthsExpenses, activeMonthlyBudget, activeCategoryBudgets, updateMonthlyBudget, updateCategoryBudgets } = useExpense();

  const isReadOnly = viewMode !== 'personal';
  const [fourMonthsData, setFourMonthsData] = useState([]);
  const [fourMonthsBudgets, setFourMonthsBudgets] = useState({});

  useEffect(() => {
    const fetchBudgetsForPast4Months = async () => {
      const months = [
        subMonths(currentMonth, 3),
        subMonths(currentMonth, 2),
        subMonths(currentMonth, 1),
        currentMonth
      ];
      const budgets = {};
      for (const m of months) {
        const monthKey = format(m, 'yyyy-MM');
        let uBudget = 0;
        let lBudget = 0;
        if (user) {
          const u = await getMonthBudget(monthKey, user, false);
          uBudget = u.monthly_budget;
        }
        if (linkedUserProfile) {
          const l = await getMonthBudget(monthKey, linkedUserProfile, true);
          lBudget = l.monthly_budget;
        }
        if (viewMode === 'connected') budgets[monthKey] = lBudget;
        else if (viewMode === 'merged') budgets[monthKey] = uBudget + lBudget;
        else budgets[monthKey] = uBudget;
      }
      setFourMonthsBudgets(budgets);
    };
    fetchBudgetsForPast4Months();
  }, [currentMonth, user, linkedUserProfile, viewMode, getMonthBudget]);

  const [editMonthlyBudget, setEditMonthlyBudget] = useState(activeMonthlyBudget || 0);
  const [editCategoryBudgets, setEditCategoryBudgets] = useState(() => {
    const initial = {};
    Object.values(CATEGORIES).forEach(cat => {
      initial[cat.id] = activeCategoryBudgets?.[cat.id] !== undefined ? activeCategoryBudgets[cat.id] : cat.defaultLimit;
    });
    return initial;
  });

  // Keep editor state in sync if active budgets change
  useEffect(() => {
    setEditMonthlyBudget(activeMonthlyBudget || 0);
    const initial = {};
    Object.values(CATEGORIES).forEach(cat => {
      initial[cat.id] = activeCategoryBudgets?.[cat.id] !== undefined ? activeCategoryBudgets[cat.id] : cat.defaultLimit;
    });
    setEditCategoryBudgets(initial);
  }, [activeMonthlyBudget, activeCategoryBudgets, viewMode]);

  useEffect(() => {
    fetchFourMonthsExpenses(currentMonth).then(data => setFourMonthsData(data || []));
  }, [currentMonth, fetchFourMonthsExpenses]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [expenses]);

  const pieData = useMemo(() => {
    return Object.values(CATEGORIES).map((cat, index) => {
      const spent = expenses
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      return {
        name: cat.label,
        value: spent,
        color: COLORS[index % COLORS.length]
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const formatK = (val) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  const barData = useMemo(() => {
    const months = [
      subMonths(currentMonth, 3),
      subMonths(currentMonth, 2),
      subMonths(currentMonth, 1),
      currentMonth
    ];

    return months.map(m => {
      const monthKey = format(m, 'yyyy-MM');
      const spent = fourMonthsData
        .filter(e => isSameMonth(parseISO(e.expense_date), m))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const budget = fourMonthsBudgets[monthKey] || 0;
      
      return {
        name: format(m, 'MMM'),
        dateObj: m,
        value: spent,
        budget: budget,
        formattedSpent: formatK(spent)
      };
    });
  }, [currentMonth, fourMonthsData, fourMonthsBudgets]);

  // Calendar and day calculations
  const today = new Date();
  const isCurrentViewingMonth = isSameMonth(currentMonth, today);
  const totalDaysInMonth = getDaysInMonth(currentMonth);

  const daysPassed = isCurrentViewingMonth
    ? Math.min(getDate(today), totalDaysInMonth)
    : (currentMonth > today ? 0 : totalDaysInMonth);

  const daysLeft = isCurrentViewingMonth
    ? Math.max(1, totalDaysInMonth - daysPassed)
    : 1;

  const monthlyBudget = activeMonthlyBudget || 0;
  const remainingBudget = monthlyBudget - totalSpent;

  const safeDailyLimit = remainingBudget > 0 ? (remainingBudget / daysLeft) : 0;
  const actualDailyAvg = daysPassed > 0 ? (totalSpent / daysPassed) : 0;

  // Category alert calculations
  const categoryAlerts = useMemo(() => {
    return Object.values(CATEGORIES).map(cat => {
      const limit = activeCategoryBudgets?.[cat.id] !== undefined
        ? activeCategoryBudgets[cat.id]
        : cat.defaultLimit;
      const spent = expenses
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      const remainingCat = Math.max(0, limit - spent);
      const overspent = spent - limit;
      return {
        cat,
        limit,
        spent,
        pct,
        roundedPct: Math.round(pct),
        remainingCat,
        overspent
      };
    });
  }, [expenses, activeCategoryBudgets]);

  const flaggedCategories = useMemo(() => {
    return categoryAlerts.filter(c => c.pct >= 85).sort((a, b) => b.pct - a.pct);
  }, [categoryAlerts]);

  const topAlert = flaggedCategories[0] || null;

  // Weekend vs Weekday day count
  const { weekdaysPassed, weekendDaysPassed } = useMemo(() => {
    let weekdays = 0;
    let weekendDays = 0;
    const daysToCount = Math.max(1, daysPassed);
    for (let day = 1; day <= daysToCount; day++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (isWeekend(d)) {
        weekendDays++;
      } else {
        weekdays++;
      }
    }
    return {
      weekdaysPassed: Math.max(1, weekdays),
      weekendDaysPassed: Math.max(1, weekendDays)
    };
  }, [currentMonth, daysPassed]);

  const weekendSpend = useMemo(() => {
    return expenses
      .filter(e => isWeekend(parseISO(e.expense_date)))
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [expenses]);

  const weekdaySpend = totalSpent - weekendSpend;
  const weekdayDailyAvg = weekdaySpend / weekdaysPassed;
  const weekendDailyAvg = weekendSpend / weekendDaysPassed;

  const weekendPct = totalSpent > 0 ? Math.round((weekendSpend / totalSpent) * 100) : 0;
  const weekdayPct = totalSpent > 0 ? (100 - weekendPct) : 0;

  // Speedometer badge state
  const speedometerBadge = useMemo(() => {
    if (remainingBudget <= 0) {
      return {
        style: 'bg-red-500/10 border-red-500/20 text-red-400',
        text: '🔴 Budget Exhausted — ₹0 safe daily spend remaining.'
      };
    }
    if (actualDailyAvg > safeDailyLimit) {
      return {
        style: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        text: '🟠 Overpacing — Your current average is higher than your safe daily limit.'
      };
    }
    return {
      style: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      text: '🟢 On Track — You are spending comfortably below your safe daily pace.'
    };
  }, [remainingBudget, actualDailyAvg, safeDailyLimit]);

  const upiSpend = expenses.filter(e => e.account === 'UPI').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const cashSpend = expenses.filter(e => e.account === 'Cash').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const othersSpend = expenses.filter(e => e.account === 'Others' || (e.account && e.account !== 'UPI' && e.account !== 'Cash')).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const paymentTotal = upiSpend + cashSpend + othersSpend;
  const upiPct = paymentTotal > 0 ? Math.round((upiSpend / paymentTotal) * 100) : 0;
  const cashPct = paymentTotal > 0 ? Math.round((cashSpend / paymentTotal) * 100) : 0;
  const othersPct = paymentTotal > 0 ? Math.max(0, 100 - upiPct - cashPct) : 0;

  const top3Spends = useMemo(() => {
    return [...expenses].sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0)).slice(0, 3);
  }, [expenses]);

  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs shadow-xl">
          <p className="text-zinc-400 mb-1">{payload[0].payload.name}</p>
          <p className="font-semibold text-emerald-500 text-sm">₹ {Math.round(payload[0].value).toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  const handleSaveBudget = () => {
    if (isReadOnly) return;
    updateMonthlyBudget(parseInt(editMonthlyBudget) || user.monthly_budget);
    updateCategoryBudgets(editCategoryBudgets);
    alert('Budgets saved successfully!');
  };

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Analytics</h1>
          {isReadOnly && (
            <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md text-[10px] font-medium">
              <Eye size={12} />
              <span>Read-Only</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium bg-zinc-900/80 px-2 py-1 rounded-full border border-zinc-800">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"><ChevronLeft size={14}/></button>
          <span className="w-20 text-center">{format(currentMonth, 'MMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"><ChevronRight size={14}/></button>
        </div>
      </div>

      {/* 3-Way Segmented Pill Switcher */}
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



      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 border border-zinc-800/80 rounded-full mb-6">
        {['Monthly', 'Category Split', 'Budget Limits'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 text-[11px] py-2 rounded-full font-medium transition-all whitespace-nowrap",
              tab === t ? "bg-emerald-500 text-zinc-950 shadow-md font-semibold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Monthly' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Monthly Spending</h3>
            <div className="h-48 w-full ml-[-20px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }} onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length) {
                    setCurrentMonth(data.activePayload[0].payload.dateObj);
                  }
                }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} dy={10} />
                  <Tooltip content={renderTooltip} cursor={{ fill: '#27272A', opacity: 0.5, radius: 4 }} />
                  <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} style={{ cursor: 'pointer' }}>
                    <LabelList dataKey="formattedSpent" position="top" fill="#71717A" fontSize={10} offset={4} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Warning / Health Card */}
          {topAlert ? (
            topAlert.pct > 100 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3.5 items-start mb-8">
                <div className="text-red-500 mt-0.5"><AlertCircle size={20} /></div>
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium mb-1.5 flex items-center justify-between text-sm">
                    Heads up! <ChevronRight size={16} />
                  </h4>
                  <p className="text-xs text-red-300 leading-relaxed font-medium">
                    🚨 {topAlert.cat.label} has exceeded its budget by ₹{Math.round(topAlert.overspent).toLocaleString('en-IN')}.
                  </p>
                </div>
              </div>
            ) : topAlert.roundedPct === 100 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3.5 items-start mb-8">
                <div className="text-red-500 mt-0.5"><AlertCircle size={20} /></div>
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium mb-1.5 flex items-center justify-between text-sm">
                    Heads up! <ChevronRight size={16} />
                  </h4>
                  <p className="text-xs text-red-300 leading-relaxed font-medium">
                    🔴 {topAlert.cat.label} has reached its maximum budget of ₹{topAlert.limit.toLocaleString('en-IN')}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3.5 items-start mb-8">
                <div className="text-amber-500 mt-0.5"><Lightbulb size={20} /></div>
                <div className="flex-1">
                  <h4 className="text-amber-500 font-medium mb-1.5 flex items-center justify-between text-sm">
                    Heads up! <ChevronRight size={16} />
                  </h4>
                  <p className="text-xs text-amber-300 leading-relaxed font-medium">
                    ⚠️ {topAlert.cat.label} is at {topAlert.roundedPct}% of its budget (₹{Math.round(topAlert.spent).toLocaleString('en-IN')} / ₹{topAlert.limit.toLocaleString('en-IN')}). Suggested safe spend: ₹{Math.round(topAlert.remainingCat / daysLeft).toLocaleString('en-IN')}/day.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3.5 items-center mb-8">
              <div className="text-emerald-400"><Sparkles size={20} /></div>
              <p className="text-xs text-emerald-300 font-medium">
                ✨ All categories are within healthy budget limits.
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {/* Daily Spending Speedometer */}
            <div className="bg-card border border-zinc-800/80 p-4 rounded-2xl shadow-sm">
              <h3 className="text-xs font-medium text-zinc-400 mb-3">Daily Spending Speedometer</h3>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <div className="text-zinc-500 text-[10px] mb-1 font-medium">Safe Daily Limit</div>
                  {remainingBudget <= 0 ? (
                    <div className="text-red-400 font-semibold text-base">₹0 <span className="text-xs font-normal text-zinc-500">/ day</span></div>
                  ) : (
                    <div className="text-emerald-400 font-semibold text-base">₹{Math.round(safeDailyLimit).toLocaleString('en-IN')} <span className="text-xs font-normal text-zinc-500">/ day</span></div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 text-[10px] mb-1 font-medium">Your Actual Daily Avg</div>
                  <div className="text-zinc-100 font-semibold text-base">₹{Math.round(actualDailyAvg).toLocaleString('en-IN')} <span className="text-xs font-normal text-zinc-500">/ day</span></div>
                </div>
              </div>

              <div className={cn("px-3 py-2 rounded-xl border text-[11px] font-medium leading-relaxed", speedometerBadge.style)}>
                {speedometerBadge.text}
              </div>
            </div>

            {/* Weekend vs Weekday Split Card */}
            <div className="bg-card border border-zinc-800/80 p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-medium text-zinc-400">Weekend vs Weekday Split</h3>
                <span className="text-[10px] text-zinc-500 font-medium">{weekdayPct}% Weekday • {weekendPct}% Weekend</span>
              </div>

              <div className="h-2 flex rounded-full overflow-hidden mb-3">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${weekdayPct}%` }} />
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${weekendPct}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Weekday ({weekdayPct}%)
                  </div>
                  <div className="font-semibold text-zinc-100 text-sm">
                    ₹{Math.round(weekdaySpend).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    Weekday Avg: ₹{Math.round(weekdayDailyAvg).toLocaleString('en-IN')}/day
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Weekend ({weekendPct}%)
                  </div>
                  <div className="font-semibold text-zinc-100 text-sm">
                    ₹{Math.round(weekendSpend).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1 font-medium">
                    Weekend Avg: ₹{Math.round(weekendDailyAvg).toLocaleString('en-IN')}/day
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Split Card */}
            <div className="bg-card border border-zinc-800/80 p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-medium text-zinc-400">Payment Methods Split</h3>
                <span className="text-[10px] text-zinc-500 font-medium">{upiPct}% UPI • {cashPct}% Cash • {othersPct}% Others</span>
              </div>

              <div className="h-2 flex rounded-full overflow-hidden mb-3 bg-zinc-900">
                <div className="bg-[#8B5CF6] h-full transition-all" style={{ width: `${upiPct}%` }} />
                <div className="bg-[#F59E0B] h-full transition-all" style={{ width: `${cashPct}%` }} />
                <div className="bg-[#3B82F6] h-full transition-all" style={{ width: `${othersPct}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] flex-shrink-0"></span>
                    <span className="truncate">UPI ({upiPct}%)</span>
                  </div>
                  <div className="font-semibold text-zinc-100 text-xs sm:text-sm truncate">
                    ₹{Math.round(upiSpend).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] flex-shrink-0"></span>
                    <span className="truncate">Cash ({cashPct}%)</span>
                  </div>
                  <div className="font-semibold text-zinc-100 text-xs sm:text-sm truncate">
                    ₹{Math.round(cashSpend).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6] flex-shrink-0"></span>
                    <span className="truncate">Others ({othersPct}%)</span>
                  </div>
                  <div className="font-semibold text-zinc-100 text-xs sm:text-sm truncate">
                    ₹{Math.round(othersSpend).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Top 3 Spends This Month */}
            <div className="bg-card border border-zinc-800/80 p-4 rounded-2xl shadow-sm">
              <h3 className="text-xs font-medium text-zinc-400 mb-3">Top 3 Spends This Month</h3>
              {top3Spends.length === 0 ? (
                <div className="text-zinc-500 text-xs text-center py-2">No expenses this month</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {top3Spends.map((exp, idx) => {
                    const cat = CATEGORIES[exp.category];
                    const Icon = cat ? LucideIcons[cat.icon] : null;
                    return (
                      <div key={exp.id} className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400">
                            {Icon ? <Icon size={12} /> : <span className="text-[10px]">{idx + 1}</span>}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-zinc-200">{exp.note || cat?.label || 'Expense'}</div>
                            <div className="text-[10px] text-zinc-500">{format(new Date(exp.expense_date), 'dd MMM')}</div>
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-zinc-100">
                          ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'Category Split' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-sm font-medium text-zinc-400 mb-6 text-center">Category Split ({format(currentMonth, 'MMMM yyyy')})</h3>

          <div className="relative h-64 w-full mb-8 flex justify-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={renderTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-semibold text-zinc-100">₹ {Math.round(totalSpent).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] font-medium text-zinc-500 mt-1">Total Spent</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No expenses this month</div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-1">
            {pieData.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-zinc-200 font-medium whitespace-normal">{d.name}:</span>
                </div>
                <div className="text-xs font-semibold text-zinc-100 flex-shrink-0 text-right">
                  ₹{Math.round(d.value).toLocaleString('en-IN')}{' '}
                  <span className="text-zinc-400 font-normal">({totalSpent > 0 ? Math.round((d.value / totalSpent) * 100) : 0}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Budget Limits' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-8">
          {/* Read-Only Notice */}
          {isReadOnly && (
            <div className="mb-6 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-3">
              <Lock size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Switch to Personal view to edit your budget limits.</span>
            </div>
          )}

          <div className="bg-card border border-zinc-800/80 rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Total Monthly Budget</h3>
            <div className={cn("flex items-center gap-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50", isReadOnly && "opacity-60")}>
              <span className="text-lg text-emerald-500 font-medium">₹</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={editMonthlyBudget}
                onChange={(e) => setEditMonthlyBudget(e.target.value)}
                className="w-full bg-transparent text-xl text-zinc-100 outline-none font-medium disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <h3 className="text-sm font-medium text-zinc-400 mb-4">Category Budgets</h3>
          <div className="flex flex-col gap-3 mb-8">
            {Object.values(CATEGORIES).map(cat => {
              const Icon = LucideIcons[cat.icon];
              const val = editCategoryBudgets[cat.id];
              return (
                <div key={cat.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500">
                      {Icon && <Icon size={20} />}
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{cat.label}</span>
                  </div>
                  <div className={cn("flex items-center gap-1 bg-zinc-950/50 px-3 py-2 rounded-lg border border-zinc-800/50 w-28", isReadOnly && "opacity-60")}>
                    <span className="text-zinc-500 text-sm">₹</span>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={val || 0}
                      onChange={(e) => setEditCategoryBudgets({...editCategoryBudgets, [cat.id]: parseInt(e.target.value) || 0})}
                      className="w-full bg-transparent text-sm text-zinc-100 outline-none text-right font-medium disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!isReadOnly && (
            <button
              onClick={handleSaveBudget}
              className="w-full bg-emerald-500 text-zinc-950 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 active:scale-98"
            >
              <Save size={20} /> Save Budget Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
