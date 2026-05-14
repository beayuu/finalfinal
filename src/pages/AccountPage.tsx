import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  Heart,
  CalendarClock,
  MapPin,
  LogOut,
  Shield,
  Wallet,
  HandHeart,
  X,
  Clock,
  Zap,
  Award,
} from "lucide-react";
import { AdoptionCertificate } from "@/components/AdoptionCertificate";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth, logout } from "@/hooks/use-auth";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import type { Adoption, Donation, VolunteerWork } from "@shared/schema";

const ADOPTIONS_KEY = ["/api/adoptions"] as const;
const DONATIONS_KEY = ["/api/donations"] as const;
const SIGNUPS_KEY = ["/api/volunteer-signups"] as const;

type SignupWithWork = {
  id: string;
  workId: string;
  signedUpAt: string;
  work: VolunteerWork;
};

function getWorkProgress(work: VolunteerWork): { pct: number; label: string; color: string } {
  const now = Date.now();
  const start = new Date(work.scheduledFor).getTime();
  const endTime = work.endDate
    ? new Date(work.endDate).getTime()
    : start + work.hours * 3600000;

  if (work.status === "completed") return { pct: 100, label: "Completed", color: "bg-emerald-500" };
  if (work.status === "cancelled") return { pct: 0, label: "Cancelled", color: "bg-red-500" };
  if (now < start) {
    const daysLeft = Math.ceil((start - now) / 86400000);
    return { pct: 0, label: `Starts in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, color: "bg-blue-500" };
  }
  if (now >= endTime) return { pct: 100, label: "Event ended", color: "bg-white/40" };
  const pct = Math.round(((now - start) / (endTime - start)) * 100);
  return { pct, label: `In progress — ${pct}%`, color: "bg-blue-500" };
}

export const AccountPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isAdmin, isLoading: authLoading, user } = useAuth();
  const [certificateAdoption, setCertificateAdoption] = useState<Adoption | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const adoptionsQuery = useQuery<Adoption[]>({
    queryKey: ADOPTIONS_KEY,
    enabled: isAuthenticated,
  });

  const donationsQuery = useQuery<Donation[]>({
    queryKey: DONATIONS_KEY,
    enabled: isAuthenticated,
  });

  const signupsQuery = useQuery<SignupWithWork[]>({
    queryKey: SIGNUPS_KEY,
    enabled: isAuthenticated,
  });

  const deleteAdoption = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/adoptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADOPTIONS_KEY });
      toast({ title: "Adoption removed" });
    },
    onError: () => {
      toast({ title: "Could not remove adoption", variant: "destructive" });
    },
  });

  const cancelSignup = useMutation({
    mutationFn: async (workId: string) => {
      await apiRequest("DELETE", `/api/volunteer-works/${workId}/signup`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SIGNUPS_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-works"] });
      toast({ title: "Signed off the volunteer slot" });
    },
    onError: () => {
      toast({ title: "Could not cancel signup", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Signed out" });
      setLocation("/");
    } catch {
      toast({ title: "Sign out failed", variant: "destructive" });
    }
  };

  const adoptions = adoptionsQuery.data ?? [];
  const donations = donationsQuery.data ?? [];
  const signups = signupsQuery.data ?? [];

  const adoptionSpend = adoptions.reduce((s, a) => s + a.amount * a.price, 0);
  const donationTotal = donations.reduce((s, d) => s + d.amount, 0);
  const totalContributed = adoptionSpend + donationTotal;
  const volunteerHours = signups.reduce((s, sg) => {
    if (sg.work.status === "completed") return s + sg.work.hours;
    return s;
  }, 0);

  const showSpinner = authLoading || !isAuthenticated;

  return (
    <main
      className="relative min-h-screen w-full overflow-x-hidden bg-black"
      data-testid="page-account"
    >
      <AdoptionCertificate
        adoption={certificateAdoption}
        username={user?.username ?? ""}
        onClose={() => setCertificateAdoption(null)}
      />
      <NavigationBarSection />

      <section className="relative px-4 pb-16 pt-32 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#052698] via-[#116bf8] to-[#21bcee] text-xl font-bold text-white">
                {user?.username?.slice(0, 2).toUpperCase() ?? "ME"}
              </div>
              <div>
                <h1
                  className="[font-family:'Inter',Helvetica] text-4xl font-bold leading-tight text-white sm:text-5xl"
                  data-testid="text-account-title"
                >
                  My Account
                </h1>
                <p className="mt-1 text-sm text-white/60" data-testid="text-account-username">
                  Signed in as {user?.username}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <Link href="/admin">
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="button-account-admin"
                    className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Shield className="h-4 w-4" />
                    Admin dashboard
                  </Button>
                </Link>
              )}
              <Button
                type="button"
                onClick={handleLogout}
                data-testid="button-account-logout"
                className="gap-2 bg-white text-black hover:bg-white/90"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </header>

          {showSpinner ? (
            <div className="flex min-h-[40vh] items-center justify-center text-white/70" data-testid="status-account-loading">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…
            </div>
          ) : (
            <>
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryTile
                  label="Spent on adoptions"
                  value={`$${adoptionSpend.toLocaleString()}`}
                  sub={`${adoptions.length} ${adoptions.length === 1 ? "coral" : "corals"}`}
                  icon={<Heart className="h-5 w-5" />}
                  testId="tile-spent"
                />
                <SummaryTile
                  label="Donated"
                  value={`$${donationTotal.toLocaleString()}`}
                  sub={`${donations.length} ${donations.length === 1 ? "donation" : "donations"}`}
                  icon={<Wallet className="h-5 w-5" />}
                  testId="tile-donated"
                />
                <SummaryTile
                  label="Total contributed"
                  value={`$${totalContributed.toLocaleString()}`}
                  sub={`${signups.length} volunteer ${signups.length === 1 ? "shift" : "shifts"}`}
                  icon={<HandHeart className="h-5 w-5" />}
                  highlight
                  testId="tile-total"
                />
                <SummaryTile
                  label="Volunteer hours"
                  value={`${volunteerHours}h`}
                  sub="from completed shifts"
                  icon={<Clock className="h-5 w-5" />}
                  testId="tile-hours"
                />
              </div>

              <Tabs defaultValue="adoptions" className="w-full">
                <TabsList className="mb-6 bg-white/5">
                  <TabsTrigger value="adoptions" data-testid="tab-adoptions">
                    Adopted corals
                  </TabsTrigger>
                  <TabsTrigger value="donations" data-testid="tab-donations">
                    Donations
                  </TabsTrigger>
                  <TabsTrigger value="volunteer" data-testid="tab-volunteer">
                    Volunteer work
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="adoptions">
                  {adoptionsQuery.isLoading ? (
                    <Loading text="Loading your adoptions…" />
                  ) : adoptions.length === 0 ? (
                    <EmptyState
                      title="No adoptions yet"
                      body="Pick a coral and start your reef. Every adoption helps protect marine life."
                      cta="Adopt your first coral"
                      onCta={() => setLocation("/adopt")}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="list-account-adoptions">
                      {adoptions.map((a) => (
                        <Card
                          key={a.id}
                          className="overflow-hidden border-white/10 bg-white/5 text-white backdrop-blur-sm transition-transform hover:scale-[1.01]"
                          data-testid={`card-account-adoption-${a.id}`}
                        >
                          <div className="relative h-44 w-full overflow-hidden">
                            <img src={a.coralImage} alt={a.coralName} className="h-full w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                          <CardContent className="flex flex-col gap-3 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold">{a.coralName}</h3>
                                <p className="text-xs text-white/60">
                                  {new Date(a.adoptedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteAdoption.mutate(a.id)}
                                disabled={deleteAdoption.isPending}
                                aria-label="Remove adoption"
                                data-testid={`button-account-delete-${a.id}`}
                                className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm">
                              <div>
                                <p className="text-white/60">Quantity</p>
                                <p className="font-semibold">{a.amount}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/60">Total</p>
                                <p className="font-semibold">${(a.amount * a.price).toLocaleString()}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCertificateAdoption(a)}
                              data-testid={`button-certificate-${a.id}`}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#21bcee]/30 bg-[#21bcee]/5 py-2 text-xs font-medium text-[#21bcee] transition-colors hover:bg-[#21bcee]/15"
                            >
                              <Award className="h-3.5 w-3.5" />
                              View Certificate
                            </button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="donations">
                  {donationsQuery.isLoading ? (
                    <Loading text="Loading your donations…" />
                  ) : donations.length === 0 ? (
                    <EmptyState
                      title="No donations yet"
                      body="Every dollar funds reef restoration, cleanups, and education."
                      cta="Make a donation"
                      onCta={() => setLocation("/donate")}
                    />
                  ) : (
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                      <CardContent className="divide-y divide-white/10 p-0">
                        {donations.map((d) => (
                          <div key={d.id} className="flex items-center justify-between p-5" data-testid={`row-donation-${d.id}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#052698] to-[#21bcee] text-white">
                                <Wallet className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-white">Donation</p>
                                <p className="text-xs text-white/60">
                                  {new Date(d.donatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <p className="text-lg font-bold text-white" data-testid={`text-donation-amount-${d.id}`}>
                              ${d.amount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="volunteer">
                  {signupsQuery.isLoading ? (
                    <Loading text="Loading your volunteer shifts…" />
                  ) : signups.length === 0 ? (
                    <EmptyState
                      title="No volunteer shifts yet"
                      body="Sign up for a reef cleanup, nursery day, or outreach session."
                      cta="Browse opportunities"
                      onCta={() => setLocation("/volunteer")}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="list-account-volunteer">
                      {signups.map((s) => {
                        const progress = getWorkProgress(s.work);
                        const statusBadge =
                          s.work.status === "open"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : s.work.status === "ongoing"
                              ? "bg-blue-500/20 text-blue-300"
                              : s.work.status === "cancelled"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-white/10 text-white/70";
                        const statusLabel =
                          s.work.status === "open" ? "Upcoming"
                            : s.work.status === "ongoing" ? "Ongoing"
                              : s.work.status === "cancelled" ? "Cancelled"
                                : "Completed";

                        return (
                          <Card
                            key={s.id}
                            className="border-white/10 bg-white/5 text-white backdrop-blur-sm"
                            data-testid={`card-signup-${s.id}`}
                          >
                            <CardContent className="flex flex-col gap-3 p-5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-semibold">{s.work.title}</h3>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <p className="text-sm text-white/70">{s.work.description}</p>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-white/60">
                                  <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-blue-400" />
                                    {progress.label}
                                  </span>
                                  <span>{progress.pct}%</span>
                                </div>
                                <Progress value={progress.pct} className="h-1.5 bg-white/10" />
                              </div>

                              <div className="flex flex-wrap gap-3 text-xs text-white/60">
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  {new Date(s.work.scheduledFor).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                  {s.work.endDate && (
                                    <> – {new Date(s.work.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
                                  )}
                                </span>
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.work.location}</span>
                                <span>{s.work.hours}h</span>
                              </div>

                              {s.work.status === "open" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={cancelSignup.isPending}
                                  onClick={() => cancelSignup.mutate(s.workId)}
                                  data-testid={`button-cancel-signup-${s.id}`}
                                  className="mt-2 self-start gap-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                                >
                                  <X className="h-4 w-4" />Cancel signup
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

function SummaryTile({ label, value, sub, icon, highlight, testId }: {
  label: string; value: string; sub: string; icon: React.ReactNode; highlight?: boolean; testId: string;
}) {
  return (
    <Card
      className={highlight ? "border-transparent bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white" : "border-white/10 bg-white/5 text-white backdrop-blur-sm"}
      data-testid={testId}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-70">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${highlight ? "bg-white/20" : "bg-white/10"}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center p-12 text-white/70">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />{text}
    </div>
  );
}

function EmptyState({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void; }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="max-w-md text-white/70">{body}</p>
        <Button type="button" onClick={onCta} className="mt-2 bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95">{cta}</Button>
      </CardContent>
    </Card>
  );
}

export default AccountPage;
