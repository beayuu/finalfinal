import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { HomePage } from "@/pages/HomePage";
import { AdoptPage } from "@/pages/AdoptPage";
import { VolunteerPage } from "@/pages/VolunteerPage";
import { DonatePage } from "@/pages/DonatePage";
import { AuthPage } from "@/pages/AuthPage";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { QRPaymentPage } from "@/pages/QRPaymentPage";
import { CardPaymentPage } from "@/pages/CardPaymentPage";
import { ContactsPage } from "@/pages/ContactsPage";

function Router() {
  const [location] = useLocation();

  return (
    <div
      key={location}
      className="page-fade-in"
      style={{ minHeight: "100vh" }}
    >
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/adopt" component={AdoptPage} />
        <Route path="/volunteer" component={VolunteerPage} />
        <Route path="/donate" component={DonatePage} />
        <Route path="/donate/qr" component={QRPaymentPage} />
        <Route path="/donate/card" component={CardPaymentPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/signup" component={AuthPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/my-adoptions" component={AccountPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
