import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { AddExpenseSheet } from './components/AddExpenseSheet';

import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-zinc-950"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function MainApp() {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <DashboardScreen />
              <BottomNav onAddExpenseClick={() => setIsAddExpenseOpen(true)} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/category/:id" element={
          <ProtectedRoute>
            <Layout>
              <CategoryScreen />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Layout>
              <AnalyticsScreen />
              <BottomNav onAddExpenseClick={() => setIsAddExpenseOpen(true)} />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
      
      {user && (
        <AddExpenseSheet 
          isOpen={isAddExpenseOpen} 
          onClose={() => setIsAddExpenseOpen(false)} 
        />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExpenseProvider>
          <MainApp />
        </ExpenseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
