import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import AdminSizes from "./pages/admin/AdminSizes.tsx";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp.tsx";
import AdminCounters from "./pages/admin/AdminCounters.tsx";
import AdminRegions from "./pages/admin/AdminRegions.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import Checkout from "./pages/Checkout.tsx";
import Payment from "./pages/Payment.tsx";
import PaymentConfirmed from "./pages/PaymentConfirmed.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WhatsAppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pagamento/:orderId" element={<Payment />} />
            <Route path="/pagamento-confirmado/:orderId" element={<PaymentConfirmed />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/sizes" element={<AdminSizes />} />
            <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
            <Route path="/admin/counters" element={<AdminCounters />} />
            <Route path="/admin/regions" element={<AdminRegions />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WhatsAppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
