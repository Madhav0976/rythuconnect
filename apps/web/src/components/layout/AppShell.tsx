import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfcf8] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
};
