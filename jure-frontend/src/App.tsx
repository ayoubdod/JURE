// src/App.tsx
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useSearchParams } from "react-router"; // ✅ keep react-router
import { HelmetProvider } from "react-helmet-async";
import { useTheme } from "@/hooks/useTheme";

import { FinanceRouteGuard } from "./components/finance/FinanceRouteGuard";
import NotFound from "./pages/NotFound";
import RouteError from "./pages/RouteError";
import ProtectedRoute from "./components/ProtectedRoute";
import LogoLoading from "@/components/common/LogoLoading";
import { JURIA_ENABLED } from "@/config/features";
import { importWithRetry } from "@/lib/chunkLoad";
import MarketingLocaleLayout, {
  LegacyMarketingRedirect,
} from "@/marketing/MarketingLocale";

/** Route-split pages: retry/reload once if a hashed chunk vanished after a deploy. */
const lazyRoute = (load: () => Promise<{ default: ComponentType }>) =>
  lazy(() => importWithRetry(load));

// Marketing pages are route-split: they load on demand and stay out of the
// authenticated app bundle (and vice versa).
const Landing = lazyRoute(() => import("./pages/Landing"));
const About = lazyRoute(() => import("./pages/About"));
const Features = lazyRoute(() => import("./pages/Features"));
const Privacy = lazyRoute(() => import("./pages/Privacy"));
const Terms = lazyRoute(() => import("./pages/Terms"));
const Status = lazyRoute(() => import("./pages/Status"));
const Contact = lazyRoute(() => import("./pages/Contact"));
const StatusSubscribe = lazyRoute(() => import("./pages/StatusSubscribe"));
const Docs = lazyRoute(() => import("./pages/Docs"));
const Pricing = lazyRoute(() => import("./pages/Pricing"));
const Community = lazyRoute(() => import("./pages/Community"));
const Security = lazyRoute(() => import("./pages/Security"));
const Demo = lazyRoute(() => import("./pages/Demo"));
const JuriaPage = lazyRoute(() => import("./pages/Juria"));
const SolutionPage = lazyRoute(() => import("./pages/solutions/SolutionPage"));
const IntentPage = lazyRoute(() => import("./pages/intent/IntentPage"));
const InsightsIndex = lazyRoute(() => import("./pages/insights/InsightsIndex"));
const InsightArticle = lazyRoute(() => import("./pages/insights/InsightArticle"));

// Auth pages are route-split too — they carry form/validation dependencies.
const SignIn = lazyRoute(() => import("./pages/SignIn"));
const SignUp = lazyRoute(() => import("./pages/SignUp"));
const ForgotPassword = lazyRoute(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyRoute(() => import("./pages/ResetPassword"));
const VerifyEmail = lazyRoute(() => import("./pages/VerifyEmail"));
const VerifyEmailWaiting = lazyRoute(() => import("./pages/VerifyEmailWaiting"));
const SetupPassword = lazyRoute(() => import("./pages/SetupPassword"));

// Authenticated app pages are also route-split so marketing visitors never
// download the dashboard bundle.
const DashboardLayout = lazyRoute(() => import("./layouts/DashboardLayout"));
const Dashboard = lazyRoute(() => import("./pages/Dashboard"));
const TeamMembers = lazyRoute(() => import("./pages/TeamMembers"));
const Profile = lazyRoute(() => import("./pages/Profile"));
const Account = lazyRoute(() => import("./pages/Account"));
const Cases = lazyRoute(() => import("./pages/Cases"));
const ConsultationsWorkspace = lazyRoute(() => import("./pages/cases/ConsultationsWorkspace"));
const LitigationWorkspace = lazyRoute(() => import("./pages/cases/LitigationWorkspace"));
const AdministrativeWorkspace = lazyRoute(() => import("./pages/cases/AdministrativeWorkspace"));
const CaseWorkspacePage = lazyRoute(() => import("./pages/cases/CaseWorkspacePage"));
const Library = lazyRoute(() => import("./pages/Library"));
const NotesPage = lazyRoute(() => import("./pages/Notes"));
const Clients = lazyRoute(() => import("./pages/Clients"));
const LegalAI = lazyRoute(() => import("./pages/LegalAI"));
const Conversations = lazyRoute(() => import("./pages/Conversations"));
const CalendarPage = lazyRoute(() => import("./pages/Calendar"));
const TasksPage = lazyRoute(() => import("./pages/Tasks"));
const AppointmentsPage = lazyRoute(() => import("./pages/Appointments"));
const Settings = lazyRoute(() => import("./pages/Settings"));
const FinancePage = lazyRoute(() => import("./pages/finance/FinancePage"));
const NotificationsPage = lazyRoute(() => import("./pages/notifications/NotificationsPage"));
const EditTask = lazyRoute(() => import("./components/task/EditTask"));
const Support = lazyRoute(() => import("./pages/Support"));

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
    <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>{element}</Suspense>
  </ProtectedRoute>
);

function LegacyChatRedirect() {
  const [params] = useSearchParams();
  const conv = params.get("selected") || params.get("conversation") || params.get("c");
  return (
    <Navigate
      to={conv ? `/dashboard/conversations?selected=${encodeURIComponent(conv)}` : "/dashboard/conversations"}
      replace
    />
  );
}

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

const SOLUTION_ROUTES: Array<{ slug: string; routeKey: string }> = [
  { slug: "solutions/law-firms", routeKey: "solutionsLawFirms" },
  { slug: "solutions/legal-departments", routeKey: "solutionsLegalDepartments" },
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
  "solutions/law-firms",
  "solutions/legal-departments",
];

const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
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
      ...SOLUTION_ROUTES.map(({ slug, routeKey }) => ({
        path: slug,
        element: pub(<SolutionPage routeKey={routeKey} />),
      })),
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
        path: "cases/consultations",
        element: app(<ConsultationsWorkspace />),
      },
      {
        path: "cases/consultations/:caseSlug",
        element: app(<CaseWorkspacePage />),
      },
      {
        path: "cases/consultation",
        element: <Navigate to="/dashboard/cases/consultations" replace />,
      },
      {
        path: "cases/litigation",
        element: app(<LitigationWorkspace />),
      },
      {
        path: "cases/litigation/:caseSlug",
        element: app(<CaseWorkspacePage />),
      },
      {
        path: "cases/administrative",
        element: app(<AdministrativeWorkspace />),
      },
      {
        path: "cases/administrative/:caseSlug",
        element: app(<CaseWorkspacePage />),
      },
      {
        path: "finance",
        element: app(
          <FinanceRouteGuard>
            <FinancePage />
          </FinanceRouteGuard>
        ),
      },
      { path: "library", element: app(<Library />) },
      { path: "notes", element: app(<NotesPage />) },
      { path: "clients", element: app(<Clients />) },
      ...(JURIA_ENABLED
        ? [
            { path: "legal-ai", element: app(<LegalAI />) },
            { path: "juria", element: app(<LegalAI />) },
          ]
        : []),
      { path: "conversations", element: app(<Conversations />) },
      { path: "chat", element: app(<LegacyChatRedirect />) },
      { path: "calendar", element: app(<CalendarPage />) },
      { path: "tasks", element: app(<TasksPage />) },
      { path: "tasks/:id/edit", element: app(<EditTask />) },
      { path: "appointments", element: app(<AppointmentsPage />) },
      {
        path: "appointment",
        element: <Navigate to="/dashboard/appointments" replace />,
      },
      {
        path: "account",
        element: app(<Account />),
      },
      {
        path: "support",
        element: app(<Support />),
      },
      { path: "settings", element: app(<Settings />) },
      { path: "messages", element: app(<Conversations />) },
      { path: "notifications", element: app(<NotificationsPage />) },
      { path: "help", element: <Navigate to="/dashboard/support" replace /> },
    ],
  },

  // 404
  { path: "*", element: <NotFound /> },
    ],
  },
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
