import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const socialLinks = [{ alt: "Social links", src: "/figmaAssets/social-links.svg" }];

const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash", color: "#0078FF", type: "qr" },
  { id: "maya", label: "Maya", color: "#22C55E", type: "qr" },
  { id: "debit", label: "Debit Card", color: "#7c3aed", type: "card" },
  { id: "credit", label: "Credit Card", color: "#f59e0b", type: "card" },
] as const;

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

const donationAmounts = ["₱ 20", "₱ 50", "₱ 100", "₱ 200", "₱ 500", "₱ 1000"];

const donationFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Donation amount is required")
    .refine(
      (v) => !isNaN(Number(v.replace(/[^0-9.]/g, ""))) && Number(v.replace(/[^0-9.]/g, "")) >= 1,
      "Minimum donation is ₱1"
    )
    .refine(
      (v) => Number(v.replace(/[^0-9.]/g, "")) <= 100000,
      "Maximum donation is ₱100,000"
    ),
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  mobilePhone: z
    .string()
    .trim()
    .min(1, "Mobile phone is required")
    .regex(/^[\d\s\-\+\(\)]{7,20}$/, "Enter a valid phone number"),
  address: z.string().trim().min(1, "Address is required"),
});

type DonationFormValues = z.infer<typeof donationFormSchema>;

const inputClass =
  "h-[42px] w-full rounded-[5px] border-2 border-[#052698] bg-white px-4 [font-family:'DM_Sans',Helvetica] text-[15px] font-bold text-black shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0";

type DonationSectionProps = {
  title: string;
  description: string;
  videoSrc: string;
  formId: string;
};

function DonationSection({ title, description, videoSrc, formId }: DonationSectionProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [methodError, setMethodError] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      amount: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobilePhone: "",
      address: "",
    },
  });

  const handleAmountClick = (amount: string) => {
    const numeric = amount.replace(/[₱\s,]/g, "").trim();
    setSelectedAmount(amount);
    form.setValue("amount", numeric);
  };

  const onSubmit = (values: DonationFormValues) => {
    if (!selectedMethod) {
      setMethodError(true);
      return;
    }
    if (!isAuthenticated) {
      toast({
        title: "Please sign in to donate",
        description: "Create an account or log in so we can record your donation.",
      });
      setLocation("/auth");
      return;
    }

    const numeric = Math.round(Number(values.amount.replace(/[^0-9.]/g, "")));
    const donorName = [values.firstName, values.middleName, values.lastName]
      .filter(Boolean)
      .join(" ");
    const methodInfo = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
    const params = new URLSearchParams({
      method: selectedMethod,
      amount: String(numeric),
      name: donorName,
      email: values.email,
    });

    if (methodInfo.type === "qr") {
      setLocation(`/donate/qr?${params}`);
    } else {
      setLocation(`/donate/card?${params}`);
    }
  };

  return (
    <section className="w-full py-10 md:py-14" aria-label={title}>
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12">
        {/* Title + description stacked above */}
        <div className="mb-8">
          <h2 className="[font-family:'Inter',Helvetica] text-[28px] font-bold text-white sm:text-[36px] lg:text-[44px]">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl [font-family:'Poppins',Helvetica] text-[15px] font-normal leading-relaxed text-white/70">
            {description}
          </p>
        </div>

        {/* Video + form side by side */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Video */}
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl lg:min-h-[460px]">
            <video
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2">
              {donationAmounts.map((amount) => {
                const active = selectedAmount === amount;
                return (
                  <Card
                    key={amount}
                    className={`group relative overflow-hidden rounded-[5px] border-0 shadow-[0px_5px_20px_-2px_#00000040] transition-colors duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-[5px] before:p-[1px] before:content-[''] before:[background:linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude] ${
                      active
                        ? "bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] before:[background:#ffffff]"
                        : "bg-white hover:bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] hover:before:[background:#ffffff]"
                    }`}
                  >
                    <CardContent className="flex h-[44px] items-center justify-center p-0">
                      <button
                        type="button"
                        onClick={() => handleAmountClick(amount)}
                        data-testid={`button-donation-${formId}-${amount}`}
                        className={`h-full w-full bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] bg-clip-text text-center [font-family:'DM_Sans',Helvetica] text-[18px] font-bold leading-[normal] text-transparent [-webkit-text-fill-color:transparent] transition-colors duration-200 ${
                          active
                            ? "bg-none [-webkit-text-fill-color:#ffffff]"
                            : "group-hover:bg-none group-hover:[-webkit-text-fill-color:#ffffff]"
                        }`}
                      >
                        {amount}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-2.5"
                data-testid={`form-donate-${formId}`}
              >
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="   Amount (e.g. 500):"
                          data-testid={`input-donation-amount-${formId}`}
                          className="h-[42px] w-full rounded-[5px] border-0 bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-4 [font-family:'DM_Sans',Helvetica] text-[15px] font-bold text-white shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-white/90 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Name row */}
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="   First Name:"
                            data-testid={`input-firstName-${formId}`}
                            className={inputClass}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="   Middle Name:"
                            data-testid={`input-middleName-${formId}`}
                            className={inputClass}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="   Last Name:"
                          data-testid={`input-lastName-${formId}`}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="   Email:"
                          data-testid={`input-email-${formId}`}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobilePhone"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="   Mobile Phone:"
                          data-testid={`input-mobilePhone-${formId}`}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="   Address:"
                          data-testid={`input-address-${formId}`}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Payment method */}
                <div className="w-full">
                  <p className="mb-2 text-sm font-semibold text-white/80">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`button-payment-${formId}-${m.id}`}
                        onClick={() => {
                          setSelectedMethod(m.id);
                          setMethodError(false);
                        }}
                        className={`h-11 rounded-lg border-2 text-sm font-bold transition-all duration-200 ${
                          selectedMethod === m.id
                            ? "text-white border-transparent"
                            : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10"
                        }`}
                        style={
                          selectedMethod === m.id
                            ? { backgroundColor: m.color, borderColor: m.color }
                            : {}
                        }
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {methodError && (
                    <p className="mt-1 text-xs text-red-400">Please select a payment method</p>
                  )}
                  {selectedMethod && (
                    <p className="mt-1 text-xs text-white/50">
                      {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.type === "qr"
                        ? "You will be redirected to a QR code payment page."
                        : "You will be redirected to enter your card details."}
                    </p>
                  )}
                </div>

                <div className="flex w-full justify-center mt-2">
                  <Button
                    type="submit"
                    data-testid={`button-submit-donation-${formId}`}
                    className="h-[46px] w-[160px] rounded-[5px] border-2 border-transparent bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[22px] font-bold text-white shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:border-[#052698] hover:bg-none hover:bg-white hover:text-[#052698]"
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}

export const DonatePage = (): JSX.Element => {
  return (
    <main className="relative w-full overflow-x-hidden bg-black">
      <NavigationBarSection />

      <div className="pt-[100px]">
        <DonationSection
          title="Donate for Ocean Clean Ups"
          description="Every peso you give funds our shoreline cleanup crews — providing gear, transport, and training so volunteers can remove plastics and debris that threaten reef ecosystems."
          videoSrc="/beach_cleanup.mp4"
          formId="ocean"
        />

        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="h-px bg-white/10" />
        </div>

        <DonationSection
          title="Donate for Coral Restoration"
          description="Your contribution directly funds coral fragment cultivation, reef monitoring expeditions, and the training of local dive volunteers who protect our ocean communities every day."
          videoSrc="/divers_coral_reef.mp4"
          formId="coral"
        />
      </div>

      <footer
        id="contacts"
        className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040]"
      >
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-10 sm:px-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-xl font-normal text-white">
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
