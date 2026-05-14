import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, CreditCard, QrCode, CheckCircle2, ChevronLeft } from "lucide-react";
import { AdoptionCertificate } from "@/components/AdoptionCertificate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Adoption, Coral } from "@shared/schema";

const socialLinks = [{ alt: "Social links", src: "/figmaAssets/social-links.svg" }];
const PLACEHOLDER_IMAGE = "/figmaAssets/adopt/coral-1.png";
const CORALS_KEY = ["/api/corals"] as const;

const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash", color: "#0078FF", bg: "bg-[#0078FF]", type: "qr" },
  { id: "maya", label: "Maya", color: "#22C55E", bg: "bg-[#22C55E]", type: "qr" },
  { id: "debit", label: "Debit Card", color: "#7c3aed", bg: "bg-[#7c3aed]", type: "card" },
  { id: "credit", label: "Credit Card", color: "#f59e0b", bg: "bg-[#f59e0b]", type: "card" },
] as const;
type PaymentId = (typeof PAYMENT_METHODS)[number]["id"];

const cardSchema = z.object({
  holderName: z.string().trim().min(2, "Cardholder name is required"),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{16}$/, "Enter a valid 16-digit card number")),
  cvc: z.string().regex(/^\d{3,4}$/, "CVC must be 3 or 4 digits"),
  zipCode: z.string().trim().min(4, "Zip code is required"),
  address: z.string().trim().min(3, "Address is required"),
  country: z.string().trim().min(2, "Country is required"),
});
type CardFormValues = z.infer<typeof cardSchema>;

const inputClass =
  "h-[42px] w-full rounded-[5px] border-2 border-[#052698] bg-white px-4 font-bold text-black shadow-[0px_4px_16px_-2px_rgba(0,0,0,0.2)] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm";

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function buildQrUrl(method: string, amount: number, coral: string) {
  const data = `${method === "gcash" ? "GCash" : "Maya"} Payment\nCoral: ${coral}\nAmount: ₱${amount.toLocaleString()}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(data)}`;
}

export const AdoptPage = (): JSX.Element => {
  const [amount, setAmount] = useState("1");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // Payment dialog state
  const [dialogStep, setDialogStep] = useState<"closed" | "method" | "qr" | "card">("closed");
  const [selectedMethod, setSelectedMethod] = useState<PaymentId | null>(null);
  const [certificateAdoption, setCertificateAdoption] = useState<Adoption | null>(null);

  const coralsQuery = useQuery<Coral[]>({ queryKey: CORALS_KEY });
  const corals = useMemo(() => coralsQuery.data ?? [], [coralsQuery.data]);

  useEffect(() => {
    if (corals.length === 0) { setActiveId(null); return; }
    if (!activeId || !corals.find((c) => c.id === activeId)) setActiveId(corals[0].id);
  }, [corals, activeId]);

  const activeCoral = corals.find((c) => c.id === activeId) ?? null;
  const stockLeft = activeCoral?.stock ?? 0;
  const isSoldOut = !!activeCoral && stockLeft <= 0;
  const parsedAmount = parseInt(amount, 10) || 0;
  const totalCost = activeCoral ? Math.max(0, parsedAmount) * activeCoral.price : 0;

  const cardForm = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { holderName: "", cardNumber: "", cvc: "", zipCode: "", address: "", country: "" },
  });

  const adoptMutation = useMutation({
    mutationFn: async () => {
      if (!activeCoral) throw new Error("Pick a coral first");
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Please enter a valid amount");
      if (parsedAmount > stockLeft) throw new Error(`Only ${stockLeft} left in stock`);
      const res = await apiRequest("POST", "/api/adoptions", { coralId: activeCoral.id, amount: parsedAmount });
      return (await res.json()) as Adoption;
    },
    onSuccess: (adoption) => {
      queryClient.invalidateQueries({ queryKey: ["/api/adoptions"] });
      queryClient.invalidateQueries({ queryKey: CORALS_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-breakdown"] });
      setDialogStep("closed");
      setSelectedMethod(null);
      cardForm.reset();
      setAmount("1");
      setCertificateAdoption(adoption);
    },
    onError: (err: Error) => {
      const msg = err.message.replace(/^\d+:\s*/, "");
      let description = msg;
      try { const p = JSON.parse(msg); if (p?.message) description = p.message; } catch { /* */ }
      toast({ title: "Couldn't complete adoption", description, variant: "destructive" });
      setDialogStep("closed");
    },
  });

  const handleAdoptClick = () => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to adopt", description: "Create a free account to track your reef." });
      setLocation("/auth");
      return;
    }
    if (!activeCoral || isSoldOut) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid number of corals.", variant: "destructive" });
      return;
    }
    if (parsedAmount > stockLeft) {
      toast({ title: "Not enough stock", description: `Only ${stockLeft} left in stock.`, variant: "destructive" });
      return;
    }
    setDialogStep("method");
  };

  const handleMethodConfirm = () => {
    if (!selectedMethod) return;
    const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
    setDialogStep(method.type === "qr" ? "qr" : "card");
  };

  const handleQrDone = () => adoptMutation.mutate();

  const onCardSubmit = () => adoptMutation.mutate();

  const closeAll = () => {
    setDialogStep("closed");
    setSelectedMethod(null);
    cardForm.reset();
  };

  return (
    <main className="relative w-full overflow-x-hidden bg-black">
      <AdoptionCertificate
        adoption={certificateAdoption}
        username={user?.username ?? ""}
        onClose={() => {
          setCertificateAdoption(null);
          setLocation("/account");
        }}
      />
      <NavigationBarSection />

      <section
        className="relative flex min-h-dvh items-center justify-center bg-black px-4 pb-10 pt-[120px] sm:px-6 lg:px-12 lg:pb-16"
        aria-label="Adopt a coral"
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-center gap-8 lg:flex-row lg:items-center lg:gap-12">
          {/* Image panel */}
          <div className="grid h-full max-h-[70vh] w-full max-w-[520px] flex-shrink-0 grid-cols-[1fr_2fr] gap-6 lg:max-h-[70vh]">
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto -ml-2 pl-2 pr-1">
              {coralsQuery.isLoading && corals.length === 0 ? (
                <div className="flex h-full items-center justify-center text-white/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : corals.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-md bg-white/5 p-4 text-center text-xs text-white/50">
                  No corals yet
                </div>
              ) : (
                corals.map((coral, index) => (
                  <button
                    key={coral.id}
                    type="button"
                    onClick={() => setActiveId(coral.id)}
                    data-testid={`button-coral-${index + 1}`}
                    className={`relative flex-1 overflow-hidden rounded-[6px] transition-all duration-200 focus:outline-none ${
                      activeId === coral.id
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black shadow-[0_0_14px_rgba(255,255,255,0.4)]"
                        : "ring-2 ring-white hover:shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                    }`}
                  >
                    <img
                      src={coral.image}
                      alt={coral.name}
                      className="h-full w-full object-cover"
                      data-testid={`img-coral-${index + 1}`}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                    />
                    {activeId === coral.id && (
                      <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex h-full min-h-0">
              {activeCoral ? (
                <img
                  key={activeCoral.id}
                  src={activeCoral.image}
                  alt={activeCoral.name}
                  className="h-full w-full rounded-[4.185px] object-cover animate-in fade-in duration-500"
                  data-testid="img-coral-featured"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-[4.185px] bg-white/5 text-white/50">
                  No coral selected
                </div>
              )}
            </div>
          </div>

          {/* Info + adopt panel */}
          <div className="flex w-full max-w-[490px] flex-col gap-3 lg:gap-4">
            <h1 className="[font-family:'Inter',Helvetica] text-[36px] font-bold leading-tight text-white sm:text-[44px] lg:text-[52px]" data-testid="text-adopt-title">
              Adopt a Coral
            </h1>
            <p className="[font-family:'DM_Sans',Helvetica] text-[20px] font-medium text-white sm:text-[24px] lg:text-[28px]" data-testid="text-coral-name">
              {activeCoral?.name ?? "—"}
            </p>
            <p className="[font-family:'Poppins',Helvetica] text-[14px] font-normal leading-relaxed text-white sm:text-[15px] lg:text-[16px]">
              {activeCoral?.description || "Pick a coral to learn more and confirm your adoption."}
            </p>

            {activeCoral && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/60">Price per coral</p>
                  <p className="text-xl font-bold text-white" data-testid="text-coral-price">${activeCoral.price}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/60">Available</p>
                  <p className={`text-xl font-bold ${isSoldOut ? "text-red-300" : "text-white"}`} data-testid="text-coral-stock">
                    {isSoldOut ? "Sold out" : `${stockLeft} left`}
                  </p>
                </div>
              </div>
            )}

            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
              max={stockLeft || undefined}
              placeholder="   Amount:"
              disabled={!activeCoral || isSoldOut}
              data-testid="input-amount"
              className="h-[44px] rounded-[5px] border-2 border-[#052698] bg-white px-4 [font-family:'DM_Sans',Helvetica] text-[18px] font-bold text-black shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
            />

            {activeCoral && totalCost > 0 && (
              <p className="text-sm text-white/70" data-testid="text-total-cost">
                Total: <span className="font-semibold text-white">${totalCost.toLocaleString()}</span>
              </p>
            )}

            <Button
              type="button"
              onClick={handleAdoptClick}
              disabled={!activeCoral || isSoldOut}
              data-testid="button-adopt-coral"
              className="h-[46px] w-full max-w-[240px] rounded-[5px] border-2 border-transparent bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[22px] font-bold text-white shadow-[0px_5.09px_20.359px_-2px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:border-[#052698] hover:bg-none hover:bg-white hover:text-[#052698] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[24px]"
            >
              Adopt a Coral
            </Button>
          </div>
        </div>
      </section>

      {/* ── STEP 1: Payment Method ── */}
      <Dialog open={dialogStep === "method"} onOpenChange={(o) => { if (!o) closeAll(); }}>
        <DialogContent className="max-w-md border-white/10 bg-[#0a0a1a] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <CreditCard className="h-5 w-5 text-[#21bcee]" />
              Choose Payment Method
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Select how you'd like to pay for your coral adoption
              {activeCoral && totalCost > 0 && (
                <span className="block mt-1 font-semibold text-white">
                  Total: <span className="text-[#21bcee]">${totalCost.toLocaleString()}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`button-method-${m.id}`}
                onClick={() => setSelectedMethod(m.id)}
                className={`relative flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                  selectedMethod === m.id
                    ? "border-transparent text-white scale-[1.03] shadow-lg"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                }`}
                style={selectedMethod === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                {m.type === "qr" ? (
                  <QrCode className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {m.label}
              </button>
            ))}
          </div>

          {selectedMethod && (
            <p className="text-center text-xs text-white/40 -mt-1">
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.type === "qr"
                ? "A QR code will be shown for you to scan and pay."
                : "You'll fill in your card details on the next screen."}
            </p>
          )}

          <Button
            type="button"
            disabled={!selectedMethod}
            onClick={handleMethodConfirm}
            data-testid="button-method-confirm"
            className="w-full bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── STEP 2a: QR Code ── */}
      <Dialog open={dialogStep === "qr"} onOpenChange={(o) => { if (!o) closeAll(); }}>
        <DialogContent className="max-w-sm border-white/10 bg-[#0a0a1a] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <QrCode className="h-5 w-5 text-[#21bcee]" />
              Scan to Pay via {selectedMethod === "gcash" ? "GCash" : "Maya"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Open your {selectedMethod === "gcash" ? "GCash" : "Maya"} app and scan the QR code below
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* QR Code */}
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              {activeCoral && selectedMethod && (
                <img
                  src={buildQrUrl(selectedMethod, totalCost, activeCoral.name)}
                  alt="Payment QR Code"
                  width={200}
                  height={200}
                  className="block"
                  data-testid="img-qr-code"
                />
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</p>
              <p className="mt-1 text-sm text-white/60">
                {parsedAmount}× {activeCoral?.name}
              </p>
            </div>
            <p className="text-center text-xs text-white/40 px-4">
              After completing payment in your app, press the button below to confirm your adoption.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogStep("method")}
              data-testid="button-qr-back"
              className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleQrDone}
              disabled={adoptMutation.isPending}
              data-testid="button-qr-done"
              className="flex-2 flex-grow bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] font-bold text-white hover:opacity-90"
            >
              {adoptMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Payment Done</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── STEP 2b: Card Details ── */}
      <Dialog open={dialogStep === "card"} onOpenChange={(o) => { if (!o) closeAll(); }}>
        <DialogContent className="max-w-md border-white/10 bg-[#0a0a1a] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <CreditCard className="h-5 w-5 text-[#21bcee]" />
              Card Details
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedMethod === "debit" ? "Debit" : "Credit"} card · Total:{" "}
              <span className="font-semibold text-white">${totalCost.toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <Form {...cardForm}>
            <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="flex flex-col gap-3" data-testid="form-card-payment">

              <FormField control={cardForm.control} name="holderName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-xs uppercase tracking-wide">Cardholder Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Juan dela Cruz" data-testid="input-card-holder" className={inputClass} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )} />

              <FormField control={cardForm.control} name="cardNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-xs uppercase tracking-wide">Card Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0000 0000 0000 0000"
                      data-testid="input-card-number"
                      maxLength={19}
                      onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                      className={inputClass + " tracking-widest"}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={cardForm.control} name="cvc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-xs uppercase tracking-wide">CVC</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="•••" maxLength={4} data-testid="input-card-cvc" className={inputClass + " tracking-widest"} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={cardForm.control} name="zipCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-xs uppercase tracking-wide">Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345" data-testid="input-card-zip" className={inputClass} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />
              </div>

              <FormField control={cardForm.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-xs uppercase tracking-wide">Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Ocean Street" data-testid="input-card-address" className={inputClass} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )} />

              <FormField control={cardForm.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-xs uppercase tracking-wide">Country</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Philippines" data-testid="input-card-country" className={inputClass} />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )} />

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogStep("method")}
                  data-testid="button-card-back"
                  className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={adoptMutation.isPending}
                  data-testid="button-card-submit"
                  className="flex-grow bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {adoptMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" />Confirm Payment</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <footer id="contacts" className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040] scroll-mt-24">
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-16 sm:px-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-2xl font-normal leading-[28.8px] tracking-[-0.48px] text-white">
              Let&apos;s work together
            </p>
            <nav aria-label="Social media">
              {socialLinks.map((link) => (
                <img key={link.src} className="h-6 w-[120px]" alt={link.alt} src={link.src} />
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};
