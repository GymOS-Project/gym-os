import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Users, UserCheck, TriangleAlert as AlertTriangle, UserX, IndianRupee, TrendingUp, UserSearch, PhoneCall } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState<DashboardStats & { recentMembers?: any[]; memberStatusChart?: any[] }>({
    totalMembers: 0, activeMembers: 0, expiredMembers: 0,
    expiringThisWeek: 0, totalRevenue: 0, monthlyRevenue: 0,
    totalEnquiries: 0, pendingFollowups: 0,
    revenueChart: [], memberStatusChart: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    api.getDashboardStats(admin.id)
      .then((data) => setStats(data as any))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin]);

  const recentMembers: any[] = (stats as any).recentMembers || [];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {admin?.owner_name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at {admin?.gym_name} today.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Members" value={loading ? "..." : stats.totalMembers} icon={Users} />
          <StatCard title="Active Members" value={loading ? "..." : stats.activeMembers} icon={UserCheck} variant="success" />
          <StatCard title="Expiring This Week" value={loading ? "..." : stats.expiringThisWeek} icon={AlertTriangle} variant="warning" />
          <StatCard title="Expired" value={loading ? "..." : stats.expiredMembers} icon={UserX} variant="destructive" />
          <StatCard title="Total Revenue" value={loading ? "..." : `₹${stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} variant="primary" />
          <StatCard title="This Month Revenue" value={loading ? "..." : `₹${stats.monthlyRevenue.toLocaleString()}`} icon={TrendingUp} variant="primary" />
          <StatCard title="Total Enquiries" value={loading ? "..." : stats.totalEnquiries} icon={UserSearch} />
          <StatCard title="Pending Follow-ups" value={loading ? "..." : stats.pendingFollowups} icon={PhoneCall} variant="warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Revenue (Last 6 Months)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueChart}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Member Status</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.memberStatusChart} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {(stats.memberStatusChart || []).map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg mb-4">Recent Members</h3>
          {recentMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No members yet. Start by adding your first member!</p>
          ) : (
            <div className="space-y-3">
              {recentMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-sm">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.phone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
