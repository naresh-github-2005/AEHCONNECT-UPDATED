import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut 
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Roster', path: '/roster' },
  { icon: FileText, label: 'Leave', path: '/leave' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', adminOnly: true },
  { icon: Settings, label: 'Admin', path: '/admin', adminOnly: true },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-1', isActive && 'animate-scale-in')} />
              <span className="text-tiny font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5 mb-1" />
          <span className="text-tiny font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};
