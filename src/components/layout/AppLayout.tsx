import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { AppHeader } from './AppHeader';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        subtitle={user?.role === 'admin' ? 'Administrator' : user?.name}
      />
      <main className="flex-1 pb-20 overflow-y-auto">
        {children || <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
};
