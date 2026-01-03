import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "./pages/Auth";
import DoctorDashboard from "./pages/DoctorDashboard";
import Roster from "./pages/Roster";
import Leave from "./pages/Leave";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import CampManagement from "./pages/CampManagement";
import DoctorProfiles from "./pages/DoctorProfiles";
import Messages from "./pages/Messages";
import Attendance from "./pages/Attendance";
import Academic from "./pages/Academic";
import SurgeryLog from "./pages/SurgeryLog";
import Notes from "./pages/Notes";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Dashboard router based on role
const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  return <DoctorDashboard />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />} 
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardRouter />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/roster"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Roster />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Leave />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/analytics"
        element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/camps"
        element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <CampManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/doctors"
        element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <DoctorProfiles />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Messages />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Attendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/academic"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Academic />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Notes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/surgery-log"
        element={
          <ProtectedRoute>
            <SurgeryLog />
          </ProtectedRoute>
        }
      />
      
      <Route path="/install" element={<Install />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
