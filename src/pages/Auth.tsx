import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Account created successfully! You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (type: 'admin' | 'doctor') => {
    if (type === 'admin') {
      setEmail('admin@hospital.com');
      setPassword('admin123');
    } else {
      setEmail('doctor@hospital.com');
      setPassword('doctor123');
    }
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="bg-primary pt-safe-top pb-12 px-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mt-8 mb-6 animate-scale-in overflow-hidden p-0">
          <img 
            src="/pwa-192x192.png" 
            alt="AEHCONNECT Logo" 
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
        <h1 className="text-hero text-primary-foreground text-center animate-fade-in">
          Auro Connect
        </h1>
        <p className="text-body text-primary-foreground/80 text-center mt-2 animate-fade-in stagger-1">
          Smart roster management for healthcare professionals
        </p>
      </div>

      {/* Auth Card */}
      <div className="flex-1 -mt-6 px-4 pb-8">
        <Card className="max-w-md mx-auto shadow-elevated animate-slide-up">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-title">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Sign up to access your dashboard' : 'Sign in to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-body font-semibold"
                size="lg"
              >
                {isSubmitting ? (
                  <span className="animate-pulse-subtle">
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </span>
                ) : (
                  <>
                    {isSignUp ? (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create Account
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign In
                      </>
                    )}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoCredentials('admin')}
                className="h-10"
              >
                Admin Demo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoCredentials('doctor')}
                className="h-10"
              >
                Doctor Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4">
        <p className="text-tiny text-muted-foreground">
          © 2026 Aravind Eye Hospital
        </p>
      </div>
    </div>
  );
};

export default Auth;
