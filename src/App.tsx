import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Maintenance from "./pages/Maintenance";
import TenantPortal from "./pages/TenantPortal";
import NotFound from "./pages/NotFound";
import AcceptInvitation from "./pages/AcceptInvitation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRole="landlord"><Dashboard /></ProtectedRoute>} />
            <Route path="/properties" element={<ProtectedRoute allowedRole="landlord"><Properties /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute allowedRole="landlord"><Tenants /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRole="landlord"><Payments /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute allowedRole="landlord"><Maintenance /></ProtectedRoute>} />
            <Route path="/tenant-portal" element={<ProtectedRoute allowedRole="tenant"><TenantPortal /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
