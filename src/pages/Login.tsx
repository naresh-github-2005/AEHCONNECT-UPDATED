import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!selectedRole) return;
    
    setIsLoggingIn(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    login(selectedRole);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="bg-primary pt-safe-top pb-12 px-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mt-8 mb-6 animate-scale-in">
          <Stethoscope className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-hero text-primary-foreground text-center animate-fade-in">
          Hospital Duty
        </h1>
        <p className="text-body text-primary-foreground/80 text-center mt-2 animate-fade-in stagger-1">
          Smart roster management for healthcare professionals
        </p>
      </div>

      {/* Login Card */}
      <div className="flex-1 -mt-6 px-4 pb-8">
        <Card className="max-w-md mx-auto shadow-elevated animate-slide-up">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-title">Welcome Back</CardTitle>
            <CardDescription>Select your role to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Selection */}
            <div className="grid gap-3">
              <button
                onClick={() => setSelectedRole('doctor')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                  selectedRole === 'doctor'
                    ? 'border-primary bg-primary/5 shadow-soft'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                  selectedRole === 'doctor' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">Doctor</p>
                  <p className="text-caption text-muted-foreground">View duties & apply for leave</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 transition-all',
                  selectedRole === 'doctor' 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                )}>
                  {selectedRole === 'doctor' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setSelectedRole('admin')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                  selectedRole === 'admin'
                    ? 'border-primary bg-primary/5 shadow-soft'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                  selectedRole === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground">Administrator</p>
                  <p className="text-caption text-muted-foreground">Manage rosters & approvals</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 transition-all',
                  selectedRole === 'admin' 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                )}>
                  {selectedRole === 'admin' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={!selectedRole || isLoggingIn}
              className="w-full h-12 text-body font-semibold mt-6"
              size="lg"
            >
              {isLoggingIn ? (
                <span className="animate-pulse-subtle">Signing in...</span>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-tiny text-muted-foreground mt-4">
              Demo mode • No credentials required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4">
        <p className="text-tiny text-muted-foreground">
          © 2024 City Hospital • Duty Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
