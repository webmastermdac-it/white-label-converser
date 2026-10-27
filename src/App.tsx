import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import HotelProfile from "@/pages/client/hotel/HotelProfile";
import HotelRequests from "@/pages/client/hotel/HotelRequests";
import PublicConcierge from "@/pages/PublicConcierge";
import PublicPurchase from "@/pages/PublicPurchase";
import AdminLayout from "@/layouts/AdminLayout";
import ClientLayout from "@/layouts/ClientLayout";

// Pages
import Login from "@/pages/Login";
import LandingPage from "@/pages/LandingPage";
import VerticalLanding from "@/pages/VerticalLanding";
import SetupAssistito from "@/pages/SetupAssistito";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminClients from "@/pages/admin/AdminClients";
import AdminSetupRequests from "@/pages/admin/AdminSetupRequests";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminClientConfig from "@/pages/admin/AdminClientConfig";
import ClientOverview from "@/pages/client/ClientOverview";
import ClientChatbots from "@/pages/client/ClientChatbots";
import ClientChatbotSettings from "@/pages/client/ClientChatbotSettings";
import ClientLeads from "@/pages/client/ClientLeads";
import ClientChats from "@/pages/client/ClientChats";
import ClientBotSettings from "@/pages/client/ClientBotSettings";
import AdminChats from "@/pages/admin/AdminChats";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminEcommerce from "@/pages/admin/AdminEcommerce";
import AdminEmailTemplates from "@/pages/admin/AdminEmailTemplates";
import AdminPlatformBot from "@/pages/admin/AdminPlatformBot";
import AdminPlatformKB from "@/pages/admin/AdminPlatformKB";
import AdminPlatformLeads from "@/pages/admin/AdminPlatformLeads";
import ClientEmbed from "@/pages/client/ClientEmbed";
import ClientChatPreview from "@/pages/client/ClientChatPreview";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";
import Register from "@/pages/Register";
import ClientUpgrade from "@/pages/client/ClientUpgrade";
import ClientAnalytics from "@/pages/client/ClientAnalytics";
import ClientIntegrations from "@/pages/client/ClientIntegrations";
import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";
import ClientInstagram from "@/pages/client/ClientInstagram";
import AdminBots from "@/pages/admin/AdminBots";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
      <AuthProvider>
        <Toaster />
        <Sonner position="top-right" expand visibleToasts={12} offset={56} />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/chatbot-ecommerce" element={<VerticalLanding verticalId="ecommerce" />} />
            <Route path="/chatbot-appuntamenti" element={<VerticalLanding verticalId="booking" />} />
            <Route path="/concierge-hotel" element={<VerticalLanding verticalId="hotel" />} />
            <Route path="/chatbot-sito-aziendale" element={<VerticalLanding verticalId="general" />} />
            <Route path="/setup-assistito" element={<SetupAssistito />} />
            <Route path="/c/:embed_token" element={<PublicConcierge />} />
            <Route path="/acquista" element={<PublicPurchase />} />

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
              <Route path="setup" element={<AdminSetupRequests />} />
              <Route path="bots" element={<AdminBots />} />
              <Route path="bots/:botId" element={<ClientChatbotSettings adminMode />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="chats" element={<AdminChats />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="ecommerce" element={<AdminEcommerce />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="platform-bot" element={<AdminPlatformBot />} />
              <Route path="platform-bot/kb" element={<AdminPlatformKB />} />
              <Route path="platform-leads" element={<AdminPlatformLeads />} />
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
              <Route path="bots" element={<ClientChatbots />} />
              <Route path="bots/:botId" element={<ClientChatbotSettings />} />
              <Route path="leads" element={<ClientLeads />} />
              <Route path="chats" element={<ClientChats />} />
              <Route path="settings" element={<ClientBotSettings />} />
              <Route path="preview" element={<ClientChatPreview />} />
              <Route path="embed" element={<ClientEmbed />} />
              <Route path="upgrade" element={<ClientUpgrade />} />
              <Route path="analytics" element={<ClientAnalytics />} />
              <Route path="integrations" element={<ClientIntegrations />} />
              <Route path="ecommerce" element={<Navigate to="/dashboard/integrations" replace />} />

              <Route path="knowledge-base" element={<ClientRAGKnowledgeBase />} />
              <Route path="instagram" element={<ClientInstagram />} />
              <Route path="hotel/profile" element={<HotelProfile />} />
              <Route path="hotel/requests" element={<HotelRequests />} />
              <Route path="hotel/results" element={<Navigate to="/dashboard/analytics?tab=results" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
