import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AUTH_QUERY_KEY, useAuth, type AuthUser } from "@/hooks/use-auth";
import { NavigationBarSection } from "./sections/NavigationBarSection";

/* ─── schemas ─────────────────────────────────────────────── */

const loginSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type OtpValues = z.infer<typeof otpSchema>;
type Mode = "login" | "signup";
type SignupStep = "form" | "verify";

/* ─── shared input style ───────────────────────────────────── */
const inputCls =
  "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40";

/* ─── component ────────────────────────────────────────────── */

export const AuthPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [pendingSignup, setPendingSignup] = useState<SignupValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => { if (user) setLocation("/"); }, [user, setLocation]);

  /* ── login form ── */
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  /* ── signup form ── */
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", username: "", email: "", password: "", confirmPassword: "" },
  });

  /* ── otp form ── */
  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  /* ── login mutation ── */
  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const res = await apiRequest("POST", "/api/auth/login", values);
      return (await res.json()) as AuthUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
      toast({ title: "Welcome back", description: `Signed in as ${data.username}` });
      setLocation("/");
    },
    onError: (err: Error) => {
      const msg = extractMessage(err);
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    },
  });

  /* ── actual signup mutation (called after OTP verified) ── */
  const signupMutation = useMutation({
    mutationFn: async (values: SignupValues) => {
      const res = await apiRequest("POST", "/api/auth/signup", {
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
        email: values.email,
        password: values.password,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body?.message ?? res.statusText), { status: res.status });
      }
      return (await res.json()) as AuthUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
      toast({ title: "Account created!", description: `Welcome, ${data.username}!` });
      setLocation("/");
    },
    onError: (err: unknown) => {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setUsernameError("Username is already taken");
        setSignupStep("form");
        signupForm.setError("username", { message: "Username is already taken" });
        toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      } else {
        toast({ title: "Sign up failed", description: e.message, variant: "destructive" });
      }
    },
  });

  /* ── handlers ── */
  const handleLoginSubmit = (values: LoginValues) => loginMutation.mutate(values);

  const handleSignupFormSubmit = (values: SignupValues) => {
    setUsernameError("");
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(otp);
    setPendingSignup(values);
    setSignupStep("verify");
    toast({
      title: "Verification code sent!",
      description: `Demo code (no real email sent): ${otp}`,
      duration: 15000,
    });
  };

  const handleOtpSubmit = (values: OtpValues) => {
    if (values.code !== generatedOtp) {
      otpForm.setError("code", { message: "Incorrect code. Check the toast notification." });
      return;
    }
    if (pendingSignup) signupMutation.mutate(pendingSignup);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSignupStep("form");
    setUsernameError("");
    loginForm.clearErrors();
    signupForm.clearErrors();
    otpForm.reset();
    setPendingSignup(null);
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black" data-testid="page-auth">
      <NavigationBarSection />
      <img
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        alt="Coral reef background"
        src="/figmaAssets/image-1.png"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-[rgba(17,107,248,0.6)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-32 pb-16 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 p-8 backdrop-blur-md shadow-2xl">

          {/* mode tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1" role="tablist">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                data-testid={`tab-${m}`}
                onClick={() => switchMode(m)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-white text-black" : "text-white/80 hover:text-white"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="[font-family:'Inter',Helvetica] text-3xl font-semibold tracking-tight text-white" data-testid="text-auth-title">
                  Welcome back
                </h1>
                <p className="mt-1 text-sm text-white/70">Sign in to keep helping the reef thrive.</p>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4" data-testid="form-auth">
                  <FormField control={loginForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="reefkeeper" autoComplete="username" data-testid="input-username" className={inputCls} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" data-testid="input-password" className={`${inputCls} pr-10`} />
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending || isLoading}
                    data-testid="button-submit-auth"
                    className="w-full bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-base font-medium text-white hover:opacity-95"
                  >
                    {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "Log in"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* ── SIGNUP STEP 1: form ── */}
          {mode === "signup" && signupStep === "form" && (
            <>
              <div className="mb-6 text-center">
                <h1 className="[font-family:'Inter',Helvetica] text-3xl font-semibold tracking-tight text-white" data-testid="text-auth-title">
                  Create your account
                </h1>
                <p className="mt-1 text-sm text-white/70">Join us in protecting our oceans.</p>
              </div>

              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignupFormSubmit)} className="space-y-3" data-testid="form-signup">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Juan" data-testid="input-firstName" className={inputCls} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="dela Cruz" data-testid="input-lastName" className={inputCls} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={signupForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="reefkeeper"
                          autoComplete="username"
                          data-testid="input-username"
                          className={inputCls}
                          onChange={(e) => { field.onChange(e); setUsernameError(""); }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                      {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
                    </FormItem>
                  )} />

                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" data-testid="input-email" className={inputCls} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" data-testid="input-password" className={`${inputCls} pr-10`} />
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showConfirm ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" data-testid="input-confirmPassword" className={`${inputCls} pr-10`} />
                          <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    data-testid="button-submit-auth"
                    className="w-full bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-base font-medium text-white hover:opacity-95 mt-2"
                  >
                    Continue
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* ── SIGNUP STEP 2: OTP verification ── */}
          {mode === "signup" && signupStep === "verify" && (
            <>
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#052698] to-[#21bcee]">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="[font-family:'Inter',Helvetica] text-2xl font-semibold text-white" data-testid="text-auth-title">
                    Verify your email
                  </h1>
                  <p className="mt-1 text-sm text-white/70">
                    A 6-digit code was sent to{" "}
                    <span className="font-medium text-white">{pendingSignup?.email}</span>.
                    <br />
                    <span className="text-white/50 text-xs">(Check the notification for the demo code.)</span>
                  </p>
                </div>
              </div>

              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4" data-testid="form-otp">
                  <FormField control={otpForm.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000000"
                          maxLength={6}
                          data-testid="input-otp-code"
                          className={`${inputCls} text-center text-2xl tracking-[0.4em] font-mono`}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    disabled={signupMutation.isPending}
                    data-testid="button-verify-otp"
                    className="w-full bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-base font-medium text-white hover:opacity-95"
                  >
                    {signupMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Verify & Create Account"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setSignupStep("form")}
                    className="w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    ← Go back
                  </button>
                </form>
              </Form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-white/70">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-white underline-offset-4 hover:underline"
              data-testid="link-switch-mode"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
};

function extractMessage(err: Error): string {
  const msg = err.message.replace(/^\d+:\s*/, "");
  try {
    const p = JSON.parse(msg);
    if (p?.message) return p.message;
  } catch { /* */ }
  return msg;
}

export default AuthPage;
