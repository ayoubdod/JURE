// src/App.tsx
import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router"; // ✅ keep react-router
import { HelmetProvider } from "react-helmet-async";
import { useTheme } from "@/hooks/useTheme";

import { FinanceRouteGuard } from "./components/finance/FinanceRouteGuard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import LogoLoading from "@/components/common/LogoLoading";
import { JURIA_ENABLED } from "@/config/features";

import MarketingLocaleLayout, {
  LegacyMarketingRedirect,
} from "@/marketing/MarketingLocale";

// Marketing pages are route-split: they load on demand and stay out of the
// authenticated app bundle (and vice versa).
const Landing = lazy(() => import("./pages/Landing"));
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Status = lazy(() => import("./pages/Status"));
const Contact = lazy(() => import("./pages/Contact"));
const StatusSubscribe = lazy(() => import("./pages/StatusSubscribe"));
const Docs = lazy(() => import("./pages/Docs"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Community = lazy(() => import("./pages/Community"));
const Security = lazy(() => import("./pages/Security"));
const Demo = lazy(() => import("./pages/Demo"));
const JuriaPage = lazy(() => import("./pages/Juria"));
const IntentPage = lazy(() => import("./pages/intent/IntentPage"));
const InsightsIndex = lazy(() => import("./pages/insights/InsightsIndex"));
const InsightArticle = lazy(() => import("./pages/insights/InsightArticle"));

// Auth pages are route-split too — they carry form/validation dependencies.
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyEmailWaiting = lazy(() => import("./pages/VerifyEmailWaiting"));
const SetupPassword = lazy(() => import("./pages/SetupPassword"));

// Authenticated app pages are also route-split so marketing visitors never
// download the dashboard bundle.
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const Profile = lazy(() => import("./pages/Profile"));
const Cases = lazy(() => import("./pages/Cases"));
const Library = lazy(() => import("./pages/Library"));
const Clients = lazy(() => import("./pages/Clients"));
const LegalAI = lazy(() => import("./pages/LegalAI"));
const Conversations = lazy(() => import("./pages/Conversations"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const FinancePage = lazy(() => import("./pages/finance/FinancePage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const EditTask = lazy(() => import("./components/EditTask"));

const queryClient = new QueryClient();

/** Public marketing page: no auth required, lazy-loaded. */
const pub = (element: ReactNode) => (
  <ProtectedRoute requireAuth={false}>
    <Suspense fallback={<LogoLoading />}>{element}</Suspense>
  </ProtectedRoute>
);

/** Authenticated app page: auth required, lazy-loaded. */
const app = (element: ReactNode) => (
  <ProtectedRoute requireAuth={true}>
    <Suspense fallback={<LogoLoading />}>{element}</Suspense>
  </ProtectedRoute>
);

/** Slugs of the 8 high-intent landing pages, mapped to registry keys. */
const INTENT_ROUTES: Array<{ slug: string; routeKey: string }> = [
  { slug: "legal-ai", routeKey: "legalAi" },
  { slug: "legal-case-management", routeKey: "legalCaseManagement" },
  { slug: "legal-practice-management", routeKey: "legalPracticeManagement" },
  { slug: "legal-research", routeKey: "legalResearch" },
  { slug: "legal-document-management", routeKey: "legalDocumentManagement" },
  { slug: "legal-operations", routeKey: "legalOperations" },
  { slug: "legal-knowledge-management", routeKey: "legalKnowledgeManagement" },
  { slug: "responsible-legal-ai", routeKey: "responsibleLegalAi" },
];

/** Legacy unprefixed marketing URLs → locale-prefixed equivalents. */
const LEGACY_MARKETING_SLUGS = [
  "about",
  "features",
  "contact",
  "pricing",
  "privacy",
  "terms",
  "status",
  "status/subscribe",
  "docs",
  "community",
  "security",
  "demo",
  "juria",
];

const router = createBrowserRouter([
  // Localized public site: /en, /fr/features, /ar/security, ...
  {
    path: "/:lang",
    element: <MarketingLocaleLayout />,
    children: [
      { index: true, element: pub(<Landing />) },
      { path: "features", element: pub(<Features />) },
      { path: "about", element: pub(<About />) },
      { path: "contact", element: pub(<Contact />) },
      { path: "pricing", element: pub(<Pricing />) },
      { path: "security", element: pub(<Security />) },
      { path: "demo", element: pub(<Demo />) },
      { path: "juria", element: pub(<JuriaPage />) },
      { path: "docs", element: pub(<Docs />) },
      { path: "community", element: pub(<Community />) },
      { path: "privacy", element: pub(<Privacy />) },
      { path: "terms", element: pub(<Terms />) },
      { path: "status", element: pub(<Status />) },
      { path: "status/subscribe", element: pub(<StatusSubscribe />) },
      ...INTENT_ROUTES.map(({ slug, routeKey }) => ({
        path: slug,
        element: pub(<IntentPage routeKey={routeKey} />),
      })),
      { path: "insights", element: pub(<InsightsIndex />) },
      { path: "insights/:slug", element: pub(<InsightArticle />) },
      { path: "*", element: <NotFound /> },
    ],
  },

  // Legacy unprefixed marketing URLs → 301 handled server-side; this is the
  // client-side fallback (dev server, stale service workers, direct SPA nav).
  { path: "/", element: <LegacyMarketingRedirect /> },
  ...LEGACY_MARKETING_SLUGS.map((slug) => ({
    path: `/${slug}`,
    element: <LegacyMarketingRedirect slug={slug} />,
  })),

  // Auth (unprefixed, unchanged)
  { path: "/signin", element: pub(<SignIn />) },
  { path: "/signup", element: pub(<SignUp />) },
  { path: "/forgot-password", element: pub(<ForgotPassword />) },
  { path: "/password-reset-confirm", element: pub(<ResetPassword />) },
  { path: "/verify-email", element: pub(<VerifyEmail />) },
  { path: "/verify-email-waiting", element: pub(<VerifyEmailWaiting />) },
  { path: "/setup-password", element: pub(<SetupPassword />) },

  // App (authenticated area)
  {
    path: "/dashboard",
    element: (
      <Suspense fallback={<LogoLoading />}>
        <DashboardLayout />
      </Suspense>
    ),
    children: [
      { path: "", element: app(<Dashboard />) },
      { path: "team", element: app(<TeamMembers />) },
      {
        // Legacy alias — /dashboard/profile is the canonical personal profile URL.
        path: "me",
        element: <Navigate to="/dashboard/profile" replace />,
      },
      { path: "profile", element: app(<Profile />) },
      { path: "profile/:id", element: app(<Profile />) },
      { path: "cases", element: app(<Cases />) },
      {
        path: "finance",
        element: app(
          <FinanceRouteGuard>
            <FinancePage />
          </FinanceRouteGuard>
        ),
      },
      { path: "library", element: app(<Library />) },
      { path: "clients", element: app(<Clients />) },
      ...(JURIA_ENABLED
        ? [
            { path: "legal-ai", element: app(<LegalAI />) },
            { path: "juria", element: app(<LegalAI />) },
          ]
        : []),
      { path: "conversations", element: app(<Conversations />) },
      { path: "tasks", element: app(<CalendarPage />) },
      { path: "tasks/:id/edit", element: app(<EditTask />) },
      { path: "settings", element: app(<Settings />) },
      { path: "messages", element: app(<Conversations />) },
      { path: "calendar", element: app(<CalendarPage />) },
      { path: "notifications", element: app(<NotificationsPage />) },
      { path: "help", element: app(<Settings />) },
    ],
  },

  // 404
  { path: "*", element: <NotFound /> },
]);

const AppContent = () => {
  // Initialize theme on app load
  useTheme();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

const App = () => <AppContent />;

export default App;
