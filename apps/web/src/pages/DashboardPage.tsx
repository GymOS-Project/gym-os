import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, UserCheck, TriangleAlert as AlertTriangle, UserX, IndianRupee, TrendingUp, UserSearch, PhoneCall } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringThisWeek: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalEnquiries: number;
  pendingFollowups: number;
  revenueChart: { month: string; revenue: number }[];
  memberStatusChart: { name: string; value: number; color: string }[];
}

const COLORS = ['hsl(174, 72%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0, activeMembers: 0, expiredMembers: 0,
    expiringThisWeek: 0, totalRevenue: 0, monthlyRevenue: 0,
    totalEnquiries: 0, pendingFollowups: 0,
    revenueChart: [], memberStatusChart: [],
  });
  const [loading, setLoading] = useState(true);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!admin) return;
    fetchStats();
  }, [admin]);

  const fetchStats = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [membersRes, packagesRes, enquiriesRes, followupsRes, txnsRes, recentRes] = await Promise.all([
        supabase.from('members').select('id, is_active, created_at').eq('admin_id', admin.id),
        supabase.from('member_packages').select('status, end_date, amount_paid, created_at').eq('admin_id', admin.id),
        supabase.from('enquiries').select('id').eq('admin_id', admin.id),
        supabase.from('followups').select('id').eq('admin_id', admin.id).eq('status', 'pending'),
        supabase.from('transactions').select('amount, transaction_date').eq('admin_id', admin.id).gte('transaction_date', monthStart),
        supabase.from('members').select('id, name, phone, created_at').eq('admin_id', admin.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const members = membersRes.data || [];
      const packages = packagesRes.data || [];
      const transactions = txnsRes.data || [];

      const activeMembers = packages.filter(p => p.status === 'active').length;
      const expiredMembers = packages.filter(p => p.status === 'expired').length;
      const expiringThisWeek = packages.filter(
        p => p.status === 'active' && p.end_date >= today && p.end_date <= weekLater
      ).length;

      const totalRevenue = packages.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      const monthlyRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Revenue chart - last 6 months
      const revenueChart: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const label = d.toLocaleString('default', { month: 'short' });
        const monthRevenue = (packagesRes.data || [])
          .filter(p => {
            const pd = new Date(p.created_at);
            return pd.getFullYear() === y && pd.getMonth() + 1 === m;
          })
          .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        revenueChart.push({ month: label, revenue: monthRevenue });
      }

      setStats({
        totalMembers: members.length,
        activeMembers,
        expiredMembers,
        expiringThisWeek,
        totalRevenue,
        monthlyRevenue,
        totalEnquiries: enquiriesRes.data?.length || 0,
        pendingFollowups: followupsRes.data?.length || 0,
        revenueChart,
        memberStatusChart: [
          { name: 'Active', value: activeMembers, color: COLORS[0] },
          { name: 'Expiring', value: expiringThisWeek, color: COLORS[1] },
          { name: 'Expired', value: expiredMembers, color: COLORS[2] },
        ],
      });
      setRecentMembers(recentRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {admin?.owner_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at {admin?.gym_name} today.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Members" value={loading ? '...' : stats.totalMembers} icon={Users} />
          <StatCard title="Active Members" value={loading ? '...' : stats.activeMembers} icon={UserCheck} variant="success" />
          <StatCard title="Expiring This Week" value={loading ? '...' : stats.expiringThisWeek} icon={AlertTriangle} variant="warning" />
          <StatCard title="Expired" value={loading ? '...' : stats.expiredMembers} icon={UserX} variant="destructive" />
          <StatCard title="Total Revenue" value={loading ? '...' : `₹${stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} variant="primary" />
          <StatCard title="This Month Revenue" value={loading ? '...' : `₹${stats.monthlyRevenue.toLocaleString()}`} icon={TrendingUp} variant="primary" />
          <StatCard title="Total Enquiries" value={loading ? '...' : stats.totalEnquiries} icon={UserSearch} />
          <StatCard title="Pending Follow-ups" value={loading ? '...' : stats.pendingFollowups} icon={PhoneCall} variant="warning" />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Revenue (Last 6 Months)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueChart}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(174, 72%, 40%)" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Member Status Pie */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Member Status</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.memberStatusChart} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {stats.memberStatusChart.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Members */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg mb-4">Recent Members</h3>
          {recentMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No members yet. Start by adding your first member!</p>
          ) : (
            <div className="space-y-3">
              {recentMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/20 text-teal-600 font-semibold text-sm">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.phone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
