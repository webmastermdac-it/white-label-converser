import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";
import ClientLayout from "@/layouts/ClientLayout";

// Pages
import Login from "@/pages/Login";
import LandingPage from "@/pages/LandingPage";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminClients from "@/pages/admin/AdminClients";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminClientConfig from "@/pages/admin/AdminClientConfig";
import ClientOverview from "@/pages/client/ClientOverview";
import ClientLeads from "@/pages/client/ClientLeads";
import ClientChats from "@/pages/client/ClientChats";
import ClientBotSettings from "@/pages/client/ClientBotSettings";
import AdminChats from "@/pages/admin/AdminChats";
import ClientEmbed from "@/pages/client/ClientEmbed";
import ClientChatPreview from "@/pages/client/ClientChatPreview";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LandingPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:clientId" element={<AdminClientConfig />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="chats" element={<AdminChats />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Client Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientOverview />} />
              <Route path="leads" element={<ClientLeads />} />
              <Route path="chats" element={<ClientChats />} />
              <Route path="settings" element={<ClientBotSettings />} />
              <Route path="preview" element={<ClientChatPreview />} />
              <Route path="embed" element={<ClientEmbed />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
