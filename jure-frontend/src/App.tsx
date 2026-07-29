// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router"; // ✅ keep react-router
import { useTheme } from "@/hooks/useTheme";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import TeamMembers from "./pages/TeamMembers";
import Profile from "./pages/Profile";
import Cases from "./pages/Cases";
import Library from "./pages/Library";
import Clients from "./pages/Clients";
import LegalAI from "./pages/LegalAI";
import Conversations from "./pages/Conversations";
import Tasks from "./pages/Tasks";
import CalendarPage from './pages/Calendar';   // ✅ the new calendar page
import Settings from "./pages/Settings";
import FinancePage from "./pages/finance/FinancePage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import { FinanceRouteGuard } from "./components/finance/FinanceRouteGuard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailWaiting from "./pages/VerifyEmailWaiting";
import SetupPassword from "./pages/SetupPassword";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";
import EditTask from "./components/EditTask";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// ✅ new public pages
import About from "./pages/About";
import Features from "@/pages/Features";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Status from "@/pages/Status";
import Contact from "@/pages/Contact";
import StatusSubscribe from "@/pages/StatusSubscribe";
import Docs from "@/pages/Docs";
import Pricing from "@/pages/Pricing";


const queryClient = new QueryClient();

const router = createBrowserRouter([
  // Public site
  {
    path: "/",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Landing />
      </ProtectedRoute>
    ),
  },
  {
    path: "/about",
    element: (
      <ProtectedRoute requireAuth={false}>
        <About />
      </ProtectedRoute>
    ),
  },
  {
    path: "/features",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Features />
      </ProtectedRoute>
    ),
  },
  {
    path: "/privacy",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Privacy />
      </ProtectedRoute>
    ),
  },
  {
    path: "/terms",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Terms />
      </ProtectedRoute>
    ),
  },
  {
    path: "/status",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Status />
      </ProtectedRoute>
    ),
  },
  {
    path: "/contact",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Contact />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pricing",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Pricing />
      </ProtectedRoute>
    ),
  },
  {
    path: "/status/subscribe",
    element: (
      <ProtectedRoute requireAuth={false}>
        <StatusSubscribe />
      </ProtectedRoute>
    ),
  },
  {
    path: "/docs",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Docs />
      </ProtectedRoute>
    ),
  },
  {
    path: "/signin",
    element: (
      <ProtectedRoute requireAuth={false}>
        <SignIn />
      </ProtectedRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <ProtectedRoute requireAuth={false}>
        <SignUp />
      </ProtectedRoute>
    ),
  },
  {
    path: "/demo",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Demo />
      </ProtectedRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <ProtectedRoute requireAuth={false}>
        <ForgotPassword />
      </ProtectedRoute>
    ),
  },
  {
    path: "/password-reset-confirm",
    element: (
      <ProtectedRoute requireAuth={false}>
        <ResetPassword />
      </ProtectedRoute>
    ),
  },
  {
    path: "/verify-email",
    element: (
      <ProtectedRoute requireAuth={false}>
        <VerifyEmail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/verify-email-waiting",
    element: (
      <ProtectedRoute requireAuth={false}>
        <VerifyEmailWaiting />
      </ProtectedRoute>
    ),
  },
  {
    path: "/setup-password",
    element: (
      <ProtectedRoute requireAuth={false}>
        <SetupPassword />
      </ProtectedRoute>
    ),
  },

  // App (authenticated area)
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        path: "",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "team",
        element: (
          <ProtectedRoute requireAuth={true}>
            <TeamMembers />
          </ProtectedRoute>
        ),
      },
      {
        path: "me",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile/:id",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "cases",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Cases />
          </ProtectedRoute>
        ),
      },
      {
        path: "finance",
        element: (
          <ProtectedRoute requireAuth={true}>
            <FinanceRouteGuard>
              <FinancePage />
            </FinanceRouteGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: "library",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Library />
          </ProtectedRoute>
        ),
      },
      {
        path: "clients",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Clients />
          </ProtectedRoute>
        ),
      },
      {
        path: "legal-ai",
        element: (
          <ProtectedRoute requireAuth={true}>
            <LegalAI />
          </ProtectedRoute>
        ),
      },
      {
        path: "juria",
        element: (
          <ProtectedRoute requireAuth={true}>
            <LegalAI />
          </ProtectedRoute>
        ),
      },
      {
        path: "conversations",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Conversations />
          </ProtectedRoute>
        ),
      },
      {
        path: "tasks",
        element: (
          <ProtectedRoute requireAuth={true}>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "tasks/:id/edit",
        element: (
          <ProtectedRoute requireAuth={true}>
            <EditTask />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Settings />
          </ProtectedRoute>
        ),
      },
      {
        path: "messages",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Conversations />
          </ProtectedRoute>
        ),
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute requireAuth={true}>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        element: (
          <ProtectedRoute requireAuth={true}>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "help",
        element: (
          <ProtectedRoute requireAuth={true}>
            <Settings />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // 404
  { path: "*", element: <NotFound /> },
]);

const AppContent = () => {
  // Initialize theme on app load
  useTheme();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => <AppContent />;

export default App;
