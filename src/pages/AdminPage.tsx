import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart2,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  HandHeart,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Unlock,
  Users,
  Waves,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { VOLUNTEER_CATEGORIES, VOLUNTEER_STATUSES, type Coral, type VolunteerWork } from "@shared/schema";

const CORALS_KEY = ["/api/corals"] as const;
const WORKS_KEY = ["/api/volunteer-works"] as const;
const ADMIN_ADOPTIONS_KEY = ["/api/admin/adoptions"] as const;
const ADMIN_DONATIONS_KEY = ["/api/admin/donations"] as const;
const ADMIN_USERS_KEY = ["/api/admin/users"] as const;
const ADMIN_SIGNUPS_KEY = ["/api/admin/volunteer-signups"] as const;

type WorkWithCount = VolunteerWork & { volunteerCount: number };

type AdminAdoption = {
  id: string;
  userId: string;
  username: string;
  coralName: string;
  coralImage: string;
  amount: number;
  price: number;
  adoptedAt: string;
};

type AdminDonation = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  donorName: string | null;
  donorEmail: string | null;
  donatedAt: string;
};

type AdminUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  adoptionCount: number;
  donationTotal: number;
  volunteerShifts: number;
};

type AdminSignup = {
  id: string;
  userId: string;
  username: string;
  workId: string;
  workTitle: string;
  signedUpAt: string;
};

type CoralFormState = { name: string; image: string; description: string; price: string; stock: string };
const emptyCoralForm: CoralFormState = { name: "", image: "", description: "", price: "", stock: "" };

type WorkFormState = {
  title: string;
  description: string;
  location: string;
  scheduledFor: string;
  endDate: string;
  hours: string;
  status: typeof VOLUNTEER_STATUSES[number];
  category: typeof VOLUNTEER_CATEGORIES[number];
  maxVolunteers: string;
};
const emptyWorkForm: WorkFormState = {
  title: "", description: "", location: "", scheduledFor: "", endDate: "",
  hours: "", status: "open", category: "other", maxVolunteers: "",
};

function toLocalInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CHART_COLORS = ["#21bcee", "#116bf8", "#052698", "#7c3aed", "#f59e0b", "#94a3b8"];

const STATUS_BADGES: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-300",
  closed: "bg-amber-500/20 text-amber-300",
  completed: "bg-white/10 text-white/70",
  ongoing: "bg-blue-500/20 text-blue-300",
  cancelled: "bg-red-500/20 text-red-300",
};

export const AdminPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isAdmin, isLoading: authLoading, user } = useAuth();
  const [tab, setTab] = useState("overview");

  const [coralDialogOpen, setCoralDialogOpen] = useState(false);
  const [editingCoralId, setEditingCoralId] = useState<string | null>(null);
  const [coralForm, setCoralForm] = useState<CoralFormState>(emptyCoralForm);

  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workForm, setWorkForm] = useState<WorkFormState>(emptyWorkForm);

  const [deleteTarget, setDeleteTarget] = useState<{ type: "coral" | "work"; id: string; name: string } | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) setLocation("/auth");
    else if (!isAdmin) setLocation("/");
  }, [authLoading, isAuthenticated, isAdmin, setLocation]);

  const enabled = isAuthenticated && isAdmin;

  const coralsQuery = useQuery<Coral[]>({ queryKey: CORALS_KEY, enabled });
  const worksQuery = useQuery<WorkWithCount[]>({ queryKey: WORKS_KEY, enabled });
  const adoptionsQuery = useQuery<AdminAdoption[]>({ queryKey: ADMIN_ADOPTIONS_KEY, enabled });
  const donationsQuery = useQuery<AdminDonation[]>({ queryKey: ADMIN_DONATIONS_KEY, enabled });
  const usersQuery = useQuery<AdminUser[]>({ queryKey: ADMIN_USERS_KEY, enabled });
  const signupsQuery = useQuery<AdminSignup[]>({ queryKey: ADMIN_SIGNUPS_KEY, enabled });

  const showError = (title: string) => (err: Error) => {
    let description = err.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(description); if (p?.message) description = p.message; } catch { /* */ }
    toast({ title, description, variant: "destructive" });
  };

  // --- Coral mutations ---
  const saveCoralMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: coralForm.name.trim(), image: coralForm.image.trim(), description: coralForm.description.trim(), price: Number(coralForm.price), stock: Number(coralForm.stock) };
      editingCoralId
        ? await apiRequest("PATCH", `/api/admin/corals/${editingCoralId}`, payload)
        : await apiRequest("POST", "/api/admin/corals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CORALS_KEY });
      toast({ title: editingCoralId ? "Coral updated" : "Coral added" });
      setCoralDialogOpen(false); setEditingCoralId(null); setCoralForm(emptyCoralForm);
    },
    onError: showError("Could not save coral"),
  });

  const deleteCoralMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/corals/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CORALS_KEY }); toast({ title: "Coral removed" }); },
    onError: showError("Could not remove coral"),
  });

  // --- Work mutations ---
  const saveWorkMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: workForm.title.trim(), description: workForm.description.trim(),
        location: workForm.location.trim(),
        scheduledFor: workForm.scheduledFor ? new Date(workForm.scheduledFor).toISOString() : "",
        endDate: workForm.endDate ? new Date(workForm.endDate).toISOString() : null,
        hours: Number(workForm.hours), status: workForm.status,
        category: workForm.category,
        maxVolunteers: workForm.maxVolunteers ? Number(workForm.maxVolunteers) : null,
      };
      editingWorkId
        ? await apiRequest("PATCH", `/api/admin/volunteer-works/${editingWorkId}`, payload)
        : await apiRequest("POST", "/api/admin/volunteer-works", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
      toast({ title: editingWorkId ? "Work updated" : "Work added" });
      setWorkDialogOpen(false); setEditingWorkId(null); setWorkForm(emptyWorkForm);
    },
    onError: showError("Could not save volunteer work"),
  });

  const updateWorkStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: typeof VOLUNTEER_STATUSES[number] }) => {
      await apiRequest("PATCH", `/api/admin/volunteer-works/${id}`, { status });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: WORKS_KEY }); toast({ title: "Status updated" }); },
    onError: showError("Could not update status"),
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/volunteer-works/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: WORKS_KEY }); toast({ title: "Work removed" }); },
    onError: showError("Could not remove work"),
  });

  const openAddCoral = () => { setEditingCoralId(null); setCoralForm(emptyCoralForm); setCoralDialogOpen(true); };
  const openEditCoral = (c: Coral) => {
    setEditingCoralId(c.id);
    setCoralForm({ name: c.name, image: c.image, description: c.description ?? "", price: String(c.price), stock: String(c.stock) });
    setCoralDialogOpen(true);
  };
  const openAddWork = () => {
    setEditingWorkId(null);
    const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0);
    setWorkForm({ ...emptyWorkForm, scheduledFor: toLocalInput(d) });
    setWorkDialogOpen(true);
  };
  const openEditWork = (w: VolunteerWork) => {
    setEditingWorkId(w.id);
    setWorkForm({
      title: w.title, description: w.description, location: w.location,
      scheduledFor: toLocalInput(w.scheduledFor),
      endDate: w.endDate ? toLocalInput(w.endDate) : "",
      hours: String(w.hours), status: w.status as WorkFormState["status"],
      category: (w.category as WorkFormState["category"]) ?? "other",
      maxVolunteers: w.maxVolunteers != null ? String(w.maxVolunteers) : "",
    });
    setWorkDialogOpen(true);
  };

  const corals = coralsQuery.data ?? [];
  const works = worksQuery.data ?? [];
  const adoptions = adoptionsQuery.data ?? [];
  const donations = donationsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const signups = signupsQuery.data ?? [];

  // Chart data
  const adoptionsByCoralData = corals.map((c) => ({
    name: c.name.split(" ")[0],
    adoptions: adoptions.filter((a) => a.coralName === c.name).reduce((s, a) => s + a.amount, 0),
  }));

  const donationsByDay = (() => {
    const map: Record<string, number> = {};
    donations.forEach((d) => {
      const day = new Date(d.donatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      map[day] = (map[day] ?? 0) + d.amount;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount })).slice(-10);
  })();

  const volunteerByCategory = VOLUNTEER_CATEGORIES.map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: works.filter((w) => w.category === cat).length,
  })).filter((d) => d.value > 0);

  const totalAdoptionRevenue = adoptions.reduce((s, a) => s + a.amount * a.price, 0);
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0);

  const showSpinner = authLoading || !isAuthenticated || !isAdmin;

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black" data-testid="page-admin">
      <NavigationBarSection />

      <section className="relative px-4 pb-16 pt-32 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <header className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#052698] via-[#116bf8] to-[#21bcee]">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="[font-family:'Inter',Helvetica] text-4xl font-bold leading-tight text-white sm:text-5xl" data-testid="text-admin-title">Admin</h1>
                <p className="mt-1 text-sm text-white/60">
                  Full dashboard for Adopt a Reef.{user?.username && <span className="text-white/50"> · {user.username}</span>}
                </p>
              </div>
            </div>
          </header>

          {showSpinner ? (
            <div className="flex min-h-[40vh] items-center justify-center text-white/70" data-testid="status-admin-loading">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="mb-6 flex-wrap gap-1 bg-white/5 h-auto p-1">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="corals" data-testid="tab-corals">Corals ({corals.length})</TabsTrigger>
                <TabsTrigger value="works" data-testid="tab-works">Volunteer Works ({works.length})</TabsTrigger>
                <TabsTrigger value="adoptions" data-testid="tab-adoptions">Adoptions ({adoptions.length})</TabsTrigger>
                <TabsTrigger value="donations" data-testid="tab-donations-admin">Donators ({donations.length})</TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users">Users ({users.length})</TabsTrigger>
              </TabsList>

              {/* -------- OVERVIEW -------- */}
              <TabsContent value="overview">
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard label="Total Revenue" value={`$${(totalAdoptionRevenue + totalDonations).toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} testId="stat-revenue" />
                  <StatCard label="Coral Adoptions" value={adoptions.reduce((s, a) => s + a.amount, 0)} icon={<Waves className="h-5 w-5" />} testId="stat-corals-adopted" />
                  <StatCard label="Volunteer Signups" value={signups.length} icon={<HandHeart className="h-5 w-5" />} testId="stat-volunteer-signups" />
                  <StatCard label="Registered Users" value={users.length} icon={<Users className="h-5 w-5" />} testId="stat-users" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-white text-base"><BarChart2 className="h-4 w-4" />Adoptions by Coral</CardTitle></CardHeader>
                    <CardContent>
                      {adoptionsByCoralData.every(d => d.adoptions === 0) ? (
                        <p className="py-8 text-center text-sm text-white/50">No adoptions yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={adoptionsByCoralData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                            <Bar dataKey="adoptions" fill="#21bcee" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-white text-base"><DollarSign className="h-4 w-4" />Donations Timeline</CardTitle></CardHeader>
                    <CardContent>
                      {donationsByDay.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/50">No donations yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={donationsByDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} formatter={(v) => [`$${v}`, "Amount"]} />
                            <Bar dataKey="amount" fill="#116bf8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-white text-base"><CalendarClock className="h-4 w-4" />Volunteer Works by Category</CardTitle></CardHeader>
                    <CardContent>
                      {volunteerByCategory.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/50">No volunteer works yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={volunteerByCategory}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                              labelLine={true}
                              isAnimationActive={false}
                            >
                              {volunteerByCategory.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-white text-base"><CheckCircle2 className="h-4 w-4" />Volunteer Work Status</CardTitle></CardHeader>
                    <CardContent>
                      {works.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/50">No volunteer works yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={[
                            { status: "Open", count: works.filter(w => w.status === "open").length },
                            { status: "Closed", count: works.filter(w => w.status === "closed").length },
                            { status: "Ongoing", count: works.filter(w => w.status === "ongoing").length },
                            { status: "Completed", count: works.filter(w => w.status === "completed").length },
                            { status: "Cancelled", count: works.filter(w => w.status === "cancelled").length },
                          ].filter(d => d.count > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="status" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* -------- CORALS -------- */}
              <TabsContent value="corals">
                <div className="mb-4 flex justify-end">
                  <Button type="button" onClick={openAddCoral} data-testid="button-add-coral" className="gap-2 bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95">
                    <Plus className="h-4 w-4" />Add coral
                  </Button>
                </div>
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {coralsQuery.isLoading ? (
                      <div className="flex items-center justify-center p-12 text-white/70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
                    ) : corals.length === 0 ? (
                      <p className="p-12 text-center text-white/60">No corals yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Coral</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Price</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Stock</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {corals.map((c) => (
                              <tr key={c.id} data-testid={`row-coral-${c.id}`} className="hover:bg-white/5">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <img src={c.image} alt={c.name} className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/figmaAssets/adopt/coral-1.png"; }} />
                                    <div>
                                      <p className="font-semibold" data-testid={`text-coral-name-${c.id}`}>{c.name}</p>
                                      <p className="text-xs text-white/50 max-w-xs truncate">{c.description}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right font-semibold" data-testid={`text-coral-price-${c.id}`}>${c.price}</td>
                                <td className="px-5 py-4 text-right">
                                  <span className={`font-semibold ${c.stock === 0 ? "text-red-300" : ""}`} data-testid={`text-coral-stock-${c.id}`}>{c.stock}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => openEditCoral(c)} data-testid={`button-edit-coral-${c.id}`} className="text-white hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                                    <Button type="button" variant="ghost" size="sm" disabled={deleteCoralMutation.isPending} onClick={() => setDeleteTarget({ type: "coral", id: c.id, name: c.name })} data-testid={`button-delete-coral-${c.id}`} className="text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------- VOLUNTEER WORKS -------- */}
              <TabsContent value="works">
                <div className="mb-4 flex justify-end">
                  <Button type="button" onClick={openAddWork} data-testid="button-add-work" className="gap-2 bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95">
                    <Plus className="h-4 w-4" />Add volunteer work
                  </Button>
                </div>
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {worksQuery.isLoading ? (
                      <div className="flex items-center justify-center p-12 text-white/70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
                    ) : works.length === 0 ? (
                      <p className="p-12 text-center text-white/60">No volunteer works yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Title</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Category</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Status</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Date</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Volunteers</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {works.map((w) => (
                              <tr key={w.id} data-testid={`row-work-${w.id}`} className="hover:bg-white/5">
                                <td className="px-5 py-4">
                                  <p className="font-semibold" data-testid={`text-work-title-${w.id}`}>{w.title}</p>
                                  <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{w.location}</p>
                                </td>
                                <td className="px-5 py-4 capitalize text-white/70">{w.category}</td>
                                <td className="px-5 py-4">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[w.status] ?? "bg-white/10 text-white/70"}`}>{w.status}</span>
                                </td>
                                <td className="px-5 py-4 text-white/70">
                                  {new Date(w.scheduledFor).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                  {w.endDate && <span className="block text-xs text-white/50">→ {new Date(w.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span>{w.volunteerCount}{w.maxVolunteers != null ? `/${w.maxVolunteers}` : ""}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1 flex-wrap">
                                    {w.status === "open" && (
                                      <Button type="button" variant="outline" size="sm" disabled={updateWorkStatusMutation.isPending} onClick={() => updateWorkStatusMutation.mutate({ id: w.id, status: "closed" })} data-testid={`button-close-work-${w.id}`} className="gap-1 border-white/20 bg-transparent text-white hover:bg-white/10 text-xs"><Lock className="h-3 w-3" />Close</Button>
                                    )}
                                    {w.status === "closed" && (
                                      <Button type="button" variant="outline" size="sm" disabled={updateWorkStatusMutation.isPending} onClick={() => updateWorkStatusMutation.mutate({ id: w.id, status: "open" })} data-testid={`button-open-work-${w.id}`} className="gap-1 border-white/20 bg-transparent text-white hover:bg-white/10 text-xs"><Unlock className="h-3 w-3" />Open</Button>
                                    )}
                                    {["open", "closed"].includes(w.status) && (
                                      <Button type="button" variant="outline" size="sm" disabled={updateWorkStatusMutation.isPending} onClick={() => updateWorkStatusMutation.mutate({ id: w.id, status: "completed" })} data-testid={`button-complete-work-${w.id}`} className="gap-1 border-white/20 bg-transparent text-white hover:bg-white/10 text-xs"><CheckCircle2 className="h-3 w-3" />Done</Button>
                                    )}
                                    <Button type="button" variant="ghost" size="sm" onClick={() => openEditWork(w)} data-testid={`button-edit-work-${w.id}`} className="text-white hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                                    <Button type="button" variant="ghost" size="sm" disabled={deleteWorkMutation.isPending} onClick={() => setDeleteTarget({ type: "work", id: w.id, name: w.title })} data-testid={`button-delete-work-${w.id}`} className="text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------- ADOPTIONS TABLE -------- */}
              <TabsContent value="adoptions">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {adoptionsQuery.isLoading ? (
                      <div className="flex items-center justify-center p-12 text-white/70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
                    ) : adoptions.length === 0 ? (
                      <p className="p-12 text-center text-white/60">No adoptions yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">User</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Coral</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Qty</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Total</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {adoptions.map((a) => (
                              <tr key={a.id} data-testid={`row-adoption-${a.id}`} className="hover:bg-white/5">
                                <td className="px-5 py-4 font-medium">{a.username}</td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <img src={a.coralImage} alt={a.coralName} className="h-8 w-8 rounded object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/figmaAssets/adopt/coral-1.png"; }} />
                                    {a.coralName}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right">{a.amount}</td>
                                <td className="px-5 py-4 text-right font-semibold">${(a.amount * a.price).toLocaleString()}</td>
                                <td className="px-5 py-4 text-right text-white/60">{new Date(a.adoptedAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-white/10 bg-white/5">
                            <tr>
                              <td colSpan={3} className="px-5 py-3 text-right text-xs text-white/60 uppercase tracking-wider">Total Revenue</td>
                              <td className="px-5 py-3 text-right font-bold text-white">${totalAdoptionRevenue.toLocaleString()}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------- DONATORS TABLE -------- */}
              <TabsContent value="donations">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {donationsQuery.isLoading ? (
                      <div className="flex items-center justify-center p-12 text-white/70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
                    ) : donations.length === 0 ? (
                      <p className="p-12 text-center text-white/60">No donations yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Username</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Donor Name</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Email</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Amount</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {donations.map((d) => (
                              <tr key={d.id} data-testid={`row-donation-${d.id}`} className="hover:bg-white/5">
                                <td className="px-5 py-4 font-medium">{d.username}</td>
                                <td className="px-5 py-4 text-white/70">{d.donorName ?? "—"}</td>
                                <td className="px-5 py-4 text-white/70">{d.donorEmail ?? "—"}</td>
                                <td className="px-5 py-4 text-right font-semibold">${d.amount.toLocaleString()}</td>
                                <td className="px-5 py-4 text-right text-white/60">{new Date(d.donatedAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-white/10 bg-white/5">
                            <tr>
                              <td colSpan={3} className="px-5 py-3 text-right text-xs text-white/60 uppercase tracking-wider">Total Donated</td>
                              <td className="px-5 py-3 text-right font-bold text-white">${totalDonations.toLocaleString()}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------- USERS TABLE -------- */}
              <TabsContent value="users">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardContent className="p-0">
                    {usersQuery.isLoading ? (
                      <div className="flex items-center justify-center p-12 text-white/70"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
                    ) : users.length === 0 ? (
                      <p className="p-12 text-center text-white/60">No users yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-white">
                          <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Username</th>
                              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-white/60">Role</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Adoptions</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Donated</th>
                              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-white/60">Volunteer Shifts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {users.map((u) => (
                              <tr key={u.id} data-testid={`row-user-${u.id}`} className="hover:bg-white/5">
                                <td className="px-5 py-4 font-semibold">{u.username}</td>
                                <td className="px-5 py-4">
                                  {u.isAdmin
                                    ? <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">Admin</span>
                                    : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">User</span>}
                                </td>
                                <td className="px-5 py-4 text-right">{u.adoptionCount}</td>
                                <td className="px-5 py-4 text-right">${u.donationTotal.toLocaleString()}</td>
                                <td className="px-5 py-4 text-right">{u.volunteerShifts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>

      {/* ---- DELETE CONFIRMATION ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a1a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">"{deleteTarget?.name}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "coral") deleteCoralMutation.mutate(deleteTarget.id);
                else deleteWorkMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- CORAL DIALOG ---- */}
      <Dialog open={coralDialogOpen} onOpenChange={setCoralDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0a0a1a] text-white">
          <DialogHeader><DialogTitle>{editingCoralId ? "Edit coral" : "Add coral"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {(["name", "image", "description", "price", "stock"] as const).map((field) => (
              <div key={field}>
                <Label className="text-white/80 capitalize">{field}</Label>
                {field === "description" ? (
                  <Textarea value={coralForm[field]} onChange={(e) => setCoralForm((p) => ({ ...p, [field]: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" rows={3} />
                ) : (
                  <Input value={coralForm[field]} onChange={(e) => setCoralForm((p) => ({ ...p, [field]: e.target.value }))} type={["price", "stock"].includes(field) ? "number" : "text"} className="mt-1 border-white/10 bg-white/5 text-white" data-testid={`input-coral-${field}`} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCoralDialogOpen(false)} className="border-white/20 bg-transparent text-white hover:bg-white/10">Cancel</Button>
            <Button type="button" disabled={saveCoralMutation.isPending} onClick={() => saveCoralMutation.mutate()} data-testid="button-save-coral" className="bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95">
              {saveCoralMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- WORK DIALOG ---- */}
      <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
        <DialogContent className="border-white/10 bg-[#0a0a1a] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingWorkId ? "Edit volunteer work" : "Add volunteer work"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-white/80">Title</Label><Input value={workForm.title} onChange={(e) => setWorkForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" data-testid="input-work-title" /></div>
            <div><Label className="text-white/80">Description</Label><Textarea value={workForm.description} onChange={(e) => setWorkForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" rows={3} /></div>
            <div><Label className="text-white/80">Location</Label><Input value={workForm.location} onChange={(e) => setWorkForm((p) => ({ ...p, location: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/80">Start Date & Time</Label><Input type="datetime-local" value={workForm.scheduledFor} onChange={(e) => setWorkForm((p) => ({ ...p, scheduledFor: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" /></div>
              <div><Label className="text-white/80">End Date (optional)</Label><Input type="datetime-local" value={workForm.endDate} onChange={(e) => setWorkForm((p) => ({ ...p, endDate: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/80">Hours</Label><Input type="number" value={workForm.hours} onChange={(e) => setWorkForm((p) => ({ ...p, hours: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" /></div>
              <div><Label className="text-white/80">Max Volunteers (optional)</Label><Input type="number" placeholder="Unlimited" value={workForm.maxVolunteers} onChange={(e) => setWorkForm((p) => ({ ...p, maxVolunteers: e.target.value }))} className="mt-1 border-white/10 bg-white/5 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80">Category</Label>
                <Select value={workForm.category} onValueChange={(v) => setWorkForm((p) => ({ ...p, category: v as WorkFormState["category"] }))}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOLUNTEER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/80">Status</Label>
                <Select value={workForm.status} onValueChange={(v) => setWorkForm((p) => ({ ...p, status: v as WorkFormState["status"] }))}>
                  <SelectTrigger className="mt-1 border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOLUNTEER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWorkDialogOpen(false)} className="border-white/20 bg-transparent text-white hover:bg-white/10">Cancel</Button>
            <Button type="button" disabled={saveWorkMutation.isPending} onClick={() => saveWorkMutation.mutate()} data-testid="button-save-work" className="bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95">
              {saveWorkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

function StatCard({ label, value, icon, testId }: { label: string; value: string | number; icon: React.ReactNode; testId: string }) {
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

export default AdminPage;
