import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PieChart,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { VOLUNTEER_CATEGORIES, type ExpenseBreakdown, type VolunteerWork } from "@shared/schema";

const socialLinks = [{ alt: "Social links", src: "/figmaAssets/social-links.svg" }];

type WorkWithCount = VolunteerWork & { volunteerCount: number };
type SignupWithWork = {
  id: string;
  workId: string;
  signedUpAt: string;
  work: VolunteerWork;
};

const WORKS_KEY = ["/api/volunteer-works"] as const;
const SIGNUPS_KEY = ["/api/volunteer-signups"] as const;
const BREAKDOWN_KEY = ["/api/expense-breakdown"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  cleanup: "Clean-up",
  replanting: "Replanting",
  survey: "Survey",
  outreach: "Outreach",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-300",
  closed: "bg-amber-500/20 text-amber-300",
  completed: "bg-white/10 text-white/70",
  ongoing: "bg-blue-500/20 text-blue-300",
  cancelled: "bg-red-500/20 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Full",
  completed: "Completed",
  ongoing: "Ongoing",
  cancelled: "Cancelled",
};

function getWorkProgress(work: VolunteerWork): number {
  const now = Date.now();
  const start = new Date(work.scheduledFor).getTime();
  const end = work.endDate ? new Date(work.endDate).getTime() : start + work.hours * 3600000;
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

const VALID_TABS = ["all", "cleanup", "replanting", "survey", "outreach", "other", "completed", "cancelled"];

export const VolunteerPage = (): JSX.Element => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const search = useSearch();

  const initialTab = (() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab") ?? "all";
    return VALID_TABS.includes(t) ? t : "all";
  })();

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab") ?? "all";
    const next = VALID_TABS.includes(t) ? t : "all";
    setActiveTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [search]);

  const worksQuery = useQuery<WorkWithCount[]>({ queryKey: WORKS_KEY });
  const signupsQuery = useQuery<SignupWithWork[]>({
    queryKey: SIGNUPS_KEY,
    enabled: isAuthenticated,
  });
  const breakdownQuery = useQuery<ExpenseBreakdown>({ queryKey: BREAKDOWN_KEY });

  const signedUpIds = new Set(signupsQuery.data?.map((s) => s.workId) ?? []);

  const signupMutation = useMutation({
    mutationFn: async (workId: string) => {
      await apiRequest("POST", `/api/volunteer-works/${workId}/signup`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
      queryClient.invalidateQueries({ queryKey: SIGNUPS_KEY });
      toast({ title: "You're signed up!", description: "Thanks for stepping up." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not sign up", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (workId: string) => {
      await apiRequest("DELETE", `/api/volunteer-works/${workId}/signup`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
      queryClient.invalidateQueries({ queryKey: SIGNUPS_KEY });
      toast({ title: "Signed off the slot" });
    },
    onError: () => {
      toast({ title: "Could not cancel signup", variant: "destructive" });
    },
  });

  const handleSignup = (workId: string) => {
    if (!isAuthenticated) {
      toast({ title: "Sign in to volunteer", description: "Create an account or log in to grab a slot." });
      setLocation("/auth");
      return;
    }
    signupMutation.mutate(workId);
  };

  const works = worksQuery.data ?? [];
  const activeWorks = works.filter((w) => ["open", "closed", "ongoing"].includes(w.status));
  const completedWorks = works.filter((w) => w.status === "completed");
  const cancelledWorks = works.filter((w) => w.status === "cancelled");

  const totalVolunteerHours = completedWorks.reduce(
    (sum, w) => sum + w.hours * Math.max(1, w.volunteerCount),
    0,
  );
  const totalSignups = works.reduce((sum, w) => sum + w.volunteerCount, 0);

  return (
    <main className="relative w-full overflow-x-hidden bg-black">
      <NavigationBarSection />

      <section className="relative px-4 pb-16 pt-32 sm:px-6 lg:px-12" aria-label="Volunteer dashboard">
        <div className="mx-auto w-full max-w-[1200px]">
          <header className="mb-8">
            <h1
              className="[font-family:'Inter',Helvetica] text-4xl font-bold leading-tight text-white sm:text-5xl"
              data-testid="text-volunteer-dashboard-title"
            >
              Volunteer
            </h1>
            <p className="mt-2 max-w-2xl text-base text-white/70">
              Pick a reef shift, see the impact of past work, and watch where every donated dollar goes.
            </p>
          </header>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Open opportunities" value={activeWorks.filter(w => w.status === "open").length} icon={<CalendarClock className="h-5 w-5" />} testId="stat-open-works" />
            <StatTile label="Total volunteers" value={totalSignups} icon={<Users className="h-5 w-5" />} testId="stat-total-volunteers" />
            <StatTile label="Completed projects" value={completedWorks.length} icon={<CheckCircle2 className="h-5 w-5" />} testId="stat-completed-works" />
            <StatTile label="Hours logged" value={`${totalVolunteerHours}h`} icon={<Clock className="h-5 w-5" />} testId="stat-hours" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12 w-full">
            <TabsList className="mb-6 flex-wrap gap-1 bg-white/5 h-auto p-1">
              <TabsTrigger value="all" data-testid="tab-all-works">All ({activeWorks.length})</TabsTrigger>
              {VOLUNTEER_CATEGORIES.map((cat) => {
                const count = activeWorks.filter((w) => w.category === cat).length;
                return (
                  <TabsTrigger key={cat} value={cat} data-testid={`tab-cat-${cat}`}>
                    {CATEGORY_LABELS[cat]} ({count})
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="completed" data-testid="tab-completed-works">
                Completed ({completedWorks.length})
              </TabsTrigger>
              {cancelledWorks.length > 0 && (
                <TabsTrigger value="cancelled" data-testid="tab-cancelled-works">
                  Cancelled ({cancelledWorks.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* All active */}
            <WorksTabContent
              works={activeWorks}
              signedUpIds={signedUpIds}
              busy={signupMutation.isPending || cancelMutation.isPending}
              onSignup={(id) => handleSignup(id)}
              onCancel={(id) => cancelMutation.mutate(id)}
              loading={worksQuery.isLoading}
              emptyText="No active opportunities right now. Check back soon."
            />

            {/* Per category */}
            {VOLUNTEER_CATEGORIES.map((cat) => (
              <WorksTabContent
                key={cat}
                tabValue={cat}
                works={activeWorks.filter((w) => w.category === cat)}
                signedUpIds={signedUpIds}
                busy={signupMutation.isPending || cancelMutation.isPending}
                onSignup={(id) => handleSignup(id)}
                onCancel={(id) => cancelMutation.mutate(id)}
                loading={worksQuery.isLoading}
                emptyText={`No ${CATEGORY_LABELS[cat].toLowerCase()} opportunities right now.`}
              />
            ))}

            <TabsContent value="completed">
              {worksQuery.isLoading ? (
                <Loading text="Loading past work…" />
              ) : completedWorks.length === 0 ? (
                <EmptyState text="No completed projects logged yet." />
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="list-completed-works">
                  {completedWorks.map((w) => (
                    <WorkCard key={w.id} work={w} completed />
                  ))}
                </div>
              )}
            </TabsContent>

            {cancelledWorks.length > 0 && (
              <TabsContent value="cancelled">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="list-cancelled-works">
                  {cancelledWorks.map((w) => (
                    <WorkCard key={w.id} work={w} />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>

          <ExpenseBreakdownCard data={breakdownQuery.data} loading={breakdownQuery.isLoading} />

          <div id="volunteer-form" className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-white">Want to do more?</h2>
              <p className="mt-1 text-sm text-white/70">Tell us how you'd like to help and we'll match you with the right project.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast({ title: "Thanks for volunteering!", description: "We received your interest and will be in touch soon." });
                (e.target as HTMLFormElement).reset();
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <input required name="name" placeholder="Your name" data-testid="input-volunteer-name" className="h-11 rounded-md border border-white/10 bg-black/40 px-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#21bcee]" />
              <input required type="email" name="email" placeholder="Email" data-testid="input-volunteer-email" className="h-11 rounded-md border border-white/10 bg-black/40 px-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#21bcee]" />
              <textarea name="note" rows={3} placeholder="What kind of work interests you?" data-testid="input-volunteer-note" className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#21bcee] sm:col-span-2" />
              <Button type="submit" data-testid="button-submit-volunteer" className="h-11 w-full bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95 sm:col-span-2 sm:w-fit sm:px-8">
                Send
              </Button>
            </form>
          </div>
        </div>
      </section>

      <footer id="contacts" className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040] scroll-mt-24">
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-16 sm:px-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-2xl font-normal leading-[28.8px] tracking-[-0.48px] text-white">Let&apos;s work together</p>
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

function WorksTabContent({
  tabValue = "all",
  works,
  signedUpIds,
  busy,
  onSignup,
  onCancel,
  loading,
  emptyText,
}: {
  tabValue?: string;
  works: WorkWithCount[];
  signedUpIds: Set<string>;
  busy: boolean;
  onSignup: (id: string) => void;
  onCancel: (id: string) => void;
  loading: boolean;
  emptyText: string;
}) {
  return (
    <TabsContent value={tabValue}>
      {loading ? (
        <Loading text="Loading opportunities…" />
      ) : works.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid={`list-works-${tabValue}`}>
          {works.map((w) => {
            const joined = signedUpIds.has(w.id);
            const closed = w.status === "closed";
            const ongoing = w.status === "ongoing";
            return (
              <WorkCard
                key={w.id}
                work={w}
                joined={joined}
                closed={closed}
                busy={busy}
                onPrimary={
                  (closed && !joined) || ongoing
                    ? undefined
                    : () => (joined ? onCancel(w.id) : onSignup(w.id))
                }
              />
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}

function StatTile({ label, value, icon, testId }: { label: string; value: string | number; icon: React.ReactNode; testId: string }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm" data-testid={testId}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">{icon}</div>
      </CardContent>
    </Card>
  );
}

function WorkCard({
  work,
  completed,
  closed,
  joined,
  busy,
  onPrimary,
}: {
  work: WorkWithCount;
  completed?: boolean;
  closed?: boolean;
  joined?: boolean;
  busy?: boolean;
  onPrimary?: () => void;
}) {
  const status = work.status as string;
  const badgeClass = STATUS_COLORS[status] ?? "bg-white/10 text-white/70";
  const badgeLabel = STATUS_LABELS[status] ?? status;
  const progress = ["ongoing", "open", "closed"].includes(status) ? getWorkProgress(work) : null;
  const spotsLeft =
    work.maxVolunteers != null
      ? Math.max(0, work.maxVolunteers - work.volunteerCount)
      : null;

  return (
    <Card className="flex h-full flex-col border-white/10 bg-white/5 text-white backdrop-blur-sm" data-testid={`card-work-${work.id}`}>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold leading-snug" data-testid={`text-work-title-${work.id}`}>{work.title}</h3>
            <span className="text-xs text-white/50 capitalize">{CATEGORY_LABELS[work.category] ?? work.category}</span>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{badgeLabel}</span>
        </div>

        <p className="text-sm text-white/70">{work.description}</p>

        {/* Volunteer capacity bar */}
        {work.maxVolunteers != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {work.volunteerCount} / {work.maxVolunteers} volunteers</span>
              {spotsLeft !== null && spotsLeft > 0 && (
                <span className="text-emerald-400">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
              )}
              {spotsLeft === 0 && <span className="text-amber-400">Full</span>}
            </div>
            <Progress value={Math.round((work.volunteerCount / work.maxVolunteers) * 100)} className="h-1.5 bg-white/10" />
          </div>
        )}

        {/* Event progress bar (ongoing events) */}
        {progress !== null && progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-blue-400" /> Event progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/10" />
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-3 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {new Date(work.scheduledFor).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            {work.endDate && (
              <> – {new Date(work.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
            )}
          </span>
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{work.location}</span>
          <span>{work.hours}h</span>
        </div>

        {!completed && onPrimary && (
          <Button
            type="button"
            disabled={busy}
            onClick={onPrimary}
            data-testid={`button-${joined ? "leave" : "join"}-work-${work.id}`}
            className={
              joined
                ? "mt-2 border border-white/20 bg-transparent text-white hover:bg-white/10"
                : "mt-2 bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95"
            }
          >
            {joined ? "Cancel signup" : "Sign up"}
          </Button>
        )}
        {status === "cancelled" && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
            <XCircle className="h-3.5 w-3.5" /> This event was cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseBreakdownCard({ data, loading }: { data: ExpenseBreakdown | undefined; loading: boolean }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm" data-testid="card-expense-breakdown">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Where donations go</h2>
            <p className="text-sm text-white/60">How every dollar from adoptions and donations is allocated.</p>
          </div>
        </div>
        {loading ? (
          <Loading text="Loading breakdown…" />
        ) : !data ? (
          <p className="text-white/60">No data yet.</p>
        ) : (
          <>
            <div className="mb-6 flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-wider text-white/60">Total raised</span>
              <span className="text-3xl font-bold text-white" data-testid="text-total-raised">${data.totalRaised.toLocaleString()}</span>
            </div>
            <div className="mb-6 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
              {data.categories.map((c) => (
                <div key={c.id} style={{ width: `${c.percent}%`, backgroundColor: c.color }} title={`${c.label}: ${c.percent}%`} data-testid={`bar-segment-${c.id}`} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/30 p-3" data-testid={`row-category-${c.id}`}>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <div>
                      <p className="text-sm font-medium text-white">{c.label}</p>
                      <p className="text-xs text-white/60">{c.percent}%</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white">${c.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
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

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardContent className="p-10 text-center text-white/60">{text}</CardContent>
    </Card>
  );
}
