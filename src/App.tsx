import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { DomainGate } from "@/components/DomainGate";
import Index from "./pages/Index.tsx";
import {
  HashAdminLegacyRedirect,
  HashAdminProtectedOutlet,
} from "./pages/hashadmin/HashAdminRoutes.tsx";
import HashAdminLogin from "./pages/hashadmin/HashAdminLogin.tsx";
import { HASHADMIN_BASE_PATH, HASHADMIN_LOGIN_PATH } from "@/lib/hashadmin-config";

const Payment = lazy(() => import("./pages/Payment.tsx"));
const PaymentConfirmed = lazy(() => import("./pages/PaymentConfirmed.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.tsx"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers.tsx"));
const AdminSizes = lazy(() => import("./pages/admin/AdminSizes.tsx"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp.tsx"));
const AdminFuncionarios = lazy(() => import("./pages/admin/AdminFuncionarios.tsx"));
const AdminCounters = lazy(() => import("./pages/admin/AdminCounters.tsx"));
const AdminRegions = lazy(() => import("./pages/admin/AdminRegions.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminTraffic = lazy(() => import("./pages/admin/AdminTraffic.tsx"));
const AdminGatewayFees = lazy(() => import("./pages/admin/AdminGatewayFees.tsx"));
const AdminCustomPages = lazy(() => import("./pages/admin/AdminCustomPages.tsx"));
const AdminManualPix = lazy(() => import("./pages/admin/AdminManualPix.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const StateLanding = lazy(() => import("./pages/StateLanding.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const CustomPageCheckout = lazy(() => import("./pages/CustomPageCheckout.tsx"));
const HashAdminHome = lazy(() => import("./pages/hashadmin/HashAdminHome.tsx"));
const HashAdminDashboard = lazy(() => import("./pages/hashadmin/HashAdminDashboard.tsx"));
const HashAdminOffers = lazy(() => import("./pages/hashadmin/HashAdminOffers.tsx"));
const HashAdminFaturamento = lazy(() => import("./pages/hashadmin/HashAdminFaturamento.tsx"));
const HashAdminStatePages = lazy(() => import("./pages/hashadmin/HashAdminStatePages.tsx"));
const HashAdminCustomPages = lazy(() => import("./pages/hashadmin/HashAdminCustomPages.tsx"));
const CustomPageView = lazy(() => import("./pages/CustomPageView.tsx"));
const HashAdminPartnerTasks = lazy(() => import("./pages/hashadmin/HashAdminPartnerTasks.tsx"));
const HashAdminEquipa = lazy(() => import("./pages/hashadmin/HashAdminEquipa.tsx"));
const HashAdminClients = lazy(() => import("./pages/hashadmin/HashAdminClients.tsx"));
const HashAdminGateway = lazy(() => import("./pages/hashadmin/HashAdminGateway.tsx"));
const HashAdminTraffic = lazy(() => import("./pages/hashadmin/HashAdminTraffic.tsx"));

const PageLoader = () => (
  <div className="flex min-h-[100dvh] min-h-screen w-full items-center justify-center bg-muted text-muted-foreground">
    A carregar…
  </div>
);

/** Corrige URLs como `http://host:8080//HASH2011/entrar` (barra dupla) para uma única `/`. */
function NormalizeDoubleSlashPath() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.pathname.startsWith("//")) {
      const fixed = `/${location.pathname.replace(/^\/+/, "")}`;
      navigate(`${fixed}${location.search}${location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="entulho-hoje-theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <SiteSettingsProvider>
        <WhatsAppProvider>
          <BrowserRouter>
            <DomainGate>
            <NormalizeDoubleSlashPath />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/e/:slug/checkout" element={<Checkout />} />
              <Route path="/e/:slug" element={<StateLanding />} />
              <Route path="/p/:slug" element={<CustomPageView />} />
              <Route path="/p/:slug/checkout" element={<CustomPageCheckout />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pagamento/:orderId" element={<Payment />} />
              <Route path="/pagamento-confirmado/:orderId" element={<PaymentConfirmed />} />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/offers" element={<AdminOffers />} />
              <Route path="/admin/sizes" element={<AdminSizes />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
              <Route path="/admin/funcionarios" element={<AdminFuncionarios />} />
              <Route path="/admin/counters" element={<AdminCounters />} />
              <Route path="/admin/regions" element={<AdminRegions />} />
              <Route path="/admin/state-pages" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/traffic" element={<AdminTraffic />} />
              <Route path="/admin/gateway-fees" element={<AdminGatewayFees />} />
              <Route path="/admin/custom-pages" element={<AdminCustomPages />} />
              <Route path="/admin/manual-pix" element={<AdminManualPix />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/hashadmin/*" element={<HashAdminLegacyRedirect />} />
              <Route path={HASHADMIN_LOGIN_PATH} element={<HashAdminLogin />} />
              <Route path={HASHADMIN_BASE_PATH} element={<HashAdminProtectedOutlet />}>
                <Route index element={<HashAdminHome />} />
                <Route path="dashboard" element={<HashAdminDashboard />} />
                <Route path="faturamento" element={<HashAdminFaturamento />} />
                <Route path="equipa" element={<HashAdminEquipa />} />
                <Route path="clientes" element={<HashAdminClients />} />
                <Route path="ofertas" element={<HashAdminOffers />} />
                <Route path="solicitacoes" element={<HashAdminPartnerTasks />} />
                <Route path="gateway" element={<HashAdminGateway />} />
                <Route path="trafego" element={<HashAdminTraffic />} />
                <Route path="subpaginas" element={<HashAdminStatePages />} />
                <Route path="paginas" element={<HashAdminCustomPages />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </DomainGate>
          </BrowserRouter>
        </WhatsAppProvider>
        </SiteSettingsProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
