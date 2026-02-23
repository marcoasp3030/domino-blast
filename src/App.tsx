import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ContactsPage from "./pages/ContactsPage";
import CampaignsPage from "./pages/CampaignsPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import TemplatesPage from "./pages/TemplatesPage";
import DomainsPage from "./pages/DomainsPage";
import ListsPage from "./pages/ListsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import WorkflowEditorPage from "./pages/WorkflowEditorPage";
import UsersPage from "./pages/UsersPage";
import StoresPage from "./pages/StoresPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
            <Route path="/domains" element={<ProtectedRoute><DomainsPage /></ProtectedRoute>} />
            <Route path="/lists" element={<ProtectedRoute><ListsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
            <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/stores" element={<ProtectedRoute><StoresPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
