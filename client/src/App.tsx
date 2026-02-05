import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Components
import { BottomNav } from "@/components/BottomNav";

// Pages
import NewOrdersPage from "@/pages/NewOrdersPage";
import OngoingPage from "@/pages/OngoingPage";
import OrderDetailsPage from "@/pages/OrderDetailsPage";
import WalletPage from "@/pages/WalletPage";
import MenuPage from "@/pages/MenuPage";
import ProductsPage from "@/pages/ProductsPage";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login endpoint which handles OAuth flow
    window.location.href = "/api/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Component />
      <BottomNav />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={NewOrdersPage} />} />
      <Route path="/ongoing" component={() => <ProtectedRoute component={OngoingPage} />} />
      <Route path="/orders/:id" component={() => <ProtectedRoute component={OrderDetailsPage} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={WalletPage} />} />
      <Route path="/products" component={() => <ProtectedRoute component={ProductsPage} />} />
      <Route path="/menu" component={() => <ProtectedRoute component={MenuPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
