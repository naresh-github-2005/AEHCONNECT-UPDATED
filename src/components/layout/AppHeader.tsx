import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Menu, Bell } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showNotification?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  subtitle,
  showNotification = true 
}) => {
  const { user } = useAuth();
  
  return (
    <header className="glass-header text-primary-foreground sticky top-0 z-40 pt-safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-lg font-bold">H</span>
          </div>
          <div>
            <h1 className="text-subtitle text-primary-foreground">
              {title || 'City Hospital'}
            </h1>
            {subtitle && (
              <p className="text-tiny text-primary-foreground/80">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showNotification && (
            <button className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-warning rounded-full" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
