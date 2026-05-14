import { useSearch, useLocation } from "wouter";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle2, CreditCard, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";

const cardSchema = z.object({
  cardHolder: z.string().trim().min(2, "Cardholder name is required"),
  cardNumber: z.string().trim().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, "Enter a valid 16-digit card number"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "CVC must be 3–4 digits"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Enter expiry as MM/YY"),
  address: z.string().trim().min(1, "Address is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  city: z.string().trim().min(1, "City is required"),
  country: z.string().trim().min(1, "Country is required"),
});

type CardFormValues = z.infer<typeof cardSchema>;

const METHOD_LABELS: Record<string, string> = {
  debit: "Debit Card",
  credit: "Credit Card",
};

const inputClass =
  "h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#21bcee] focus-visible:ring-offset-0";

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})/g, "$1 ").trim();
};

export const CardPaymentPage = (): JSX.Element => {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [paid, setPaid] = useState(false);

  const params = new URLSearchParams(search);
  const rawAmount = params.get("amount") ?? "0";
  const method = params.get("method") ?? "debit";
  const donorName = params.get("name") ?? "";
  const donorEmail = params.get("email") ?? "";

  const numericAmount = Math.round(Number(rawAmount.replace(/[^0-9.]/g, "")) || 0);
  const displayAmount = numericAmount > 0 ? `₱${numericAmount.toLocaleString()}` : "₱0";
  const methodLabel = METHOD_LABELS[method] ?? "Card";

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardHolder: donorName,
      cardNumber: "",
      cvc: "",
      expiry: "",
      address: "",
      postalCode: "",
      city: "",
      country: "",
    },
  });

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
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = () => {
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
            <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
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
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#052698] to-[#21bcee]">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{methodLabel} Payment</h1>
              <p className="text-sm text-white/60">Amount: <span className="font-semibold text-white">{displayAmount}</span></p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-card-payment">

                <div className="pb-2 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Card Details</p>
                </div>

                <FormField control={form.control} name="cardHolder" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 text-sm">Cardholder's Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jane Doe" data-testid="input-card-holder" className={inputClass} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="cardNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 text-sm">Card Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        data-testid="input-card-number"
                        className={inputClass}
                        onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">Expiry (MM/YY)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="09/27"
                          maxLength={5}
                          data-testid="input-expiry"
                          className={inputClass}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                            field.onChange(v);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="cvc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">CVC</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123"
                          maxLength={4}
                          type="password"
                          data-testid="input-cvc"
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />
                </div>

                <div className="pt-2 pb-2 border-b border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Billing Address</p>
                </div>

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 text-sm">Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Ocean Drive" data-testid="input-billing-address" className={inputClass} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Manila" data-testid="input-city" className={inputClass} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="postalCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1000" data-testid="input-postal-code" className={inputClass} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 text-sm">Country</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Philippines" data-testid="input-country" className={inputClass} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <div className="pt-2 flex items-center gap-2 text-xs text-white/40">
                  <Lock className="h-3 w-3" />
                  <span>Your payment details are encrypted and secure.</span>
                </div>

                <Button
                  type="submit"
                  disabled={donateMutation.isPending}
                  data-testid="button-submit-card"
                  className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95"
                >
                  {donateMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    `Pay ${displayAmount}`
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <button
            type="button"
            onClick={() => setLocation("/donate")}
            className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to donation form
          </button>
        </div>
      </div>
    </main>
  );
};

export default CardPaymentPage;
