import { useSearch, useLocation } from "wouter";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  maya: "Maya",
};

const METHOD_COLORS: Record<string, string> = {
  gcash: "#0078FF",
  maya: "#22C55E",
};

export const QRPaymentPage = (): JSX.Element => {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [paid, setPaid] = useState(false);

  const params = new URLSearchParams(search);
  const rawAmount = params.get("amount") ?? "0";
  const method = params.get("method") ?? "gcash";
  const donorName = params.get("name") ?? "";
  const donorEmail = params.get("email") ?? "";

  const numericAmount = Math.round(Number(rawAmount.replace(/[^0-9.]/g, "")) || 0);
  const displayAmount = numericAmount > 0 ? `₱${numericAmount.toLocaleString()}` : "₱0";
  const methodLabel = METHOD_LABELS[method] ?? "QR Payment";
  const accentColor = METHOD_COLORS[method] ?? "#0078FF";

  const qrData = encodeURIComponent(`${methodLabel} Payment - ${displayAmount}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${qrData}&bgcolor=ffffff&color=000000&margin=12`;

  const donateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donations", {
        amount: numericAmount,
        donorName: donorName || undefined,
        donorEmail: donorEmail || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-breakdown"] });
      setPaid(true);
    },
    onError: (err: Error) => {
      toast({ title: "Could not record donation", description: err.message, variant: "destructive" });
    },
  });

  const handleConfirmPayment = () => {
    if (!isAuthenticated) {
      toast({ title: "Sign in to donate", description: "Create an account or log in to record your donation." });
      setLocation("/auth");
      return;
    }
    donateMutation.mutate();
  };

  if (paid) {
    return (
      <main className="relative min-h-screen w-full bg-black animate-in fade-in duration-500">
        <NavigationBarSection />
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 pt-20">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Payment Confirmed!</h1>
            <p className="mt-2 text-white/70">Thank you — {displayAmount} donated via {methodLabel}.</p>
          </div>
          <Button
            onClick={() => setLocation("/")}
            className="bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95"
          >
            Back to Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-black animate-in fade-in duration-500">
      <NavigationBarSection />
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 pt-20 pb-12">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl text-center">
          <div
            className="mb-1 inline-block rounded-full px-4 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {methodLabel}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">Scan to Pay</h1>
          <p className="mt-1 text-sm text-white/60">Open your {methodLabel} app and scan the QR code below</p>

          <div className="mx-auto mt-6 w-fit rounded-2xl border-4 border-white/10 bg-white p-2 shadow-lg">
            <img
              src={qrUrl}
              alt="QR Code"
              className="h-[260px] w-[260px] rounded-lg"
              data-testid="img-qr-code"
            />
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 py-4">
            <p className="text-xs uppercase tracking-widest text-white/50">Amount Due</p>
            <p className="mt-1 text-4xl font-bold text-white" data-testid="text-qr-amount">{displayAmount}</p>
          </div>

          <p className="mt-4 text-xs text-white/40">
            After completing payment in your {methodLabel} app, press "I've Paid" to confirm your donation.
          </p>

          <Button
            onClick={handleConfirmPayment}
            disabled={donateMutation.isPending}
            data-testid="button-confirm-payment"
            className="mt-6 w-full h-12 rounded-xl text-base font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            {donateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "I've Paid"
            )}
          </Button>

          <button
            type="button"
            onClick={() => setLocation("/donate")}
            className="mt-3 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to donation form
          </button>
        </div>
      </div>
    </main>
  );
};

export default QRPaymentPage;
