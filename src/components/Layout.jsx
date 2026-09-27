import React from 'react';

export function Layout({ children }) {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background text-zinc-100 relative pb-24 shadow-2xl overflow-x-hidden flex flex-col">
      {children}
    </div>
  );
}
