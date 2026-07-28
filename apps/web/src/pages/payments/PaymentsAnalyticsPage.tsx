import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area } from "recharts";

import { AppLayout } from "@/components/layout/AppLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { todayDateValue } from "@/lib/date";
import { useAuth } from "@/contexts/AuthContext";
import { ChartBar as BarChart2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsAnalyticsPage() {
  const today = todayDateValue();
  const { admin, selectedGymId } = useAuth();
  const [filters, setFilters] = useState({ date_from: "", date_to: "" });
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      setAnalytics(await api.getPaymentAnalytics({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [admin, selectedGymId, filters.date_from, filters.date_to]);

  return (
    <AppLayout title="Payments Analytics">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Payments Analytics</h1>
            <p className="mt-0.5 text-muted-foreground">Understand collections, discounts, coupons, and revenue trends in detail.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row">
          <DatePicker value={filters.date_from} onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))} placeholder="From date" className="flex-1" maxDate={filters.date_to || today} />
          <DatePicker value={filters.date_to} onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))} placeholder="To date" className="flex-1" minDate={filters.date_from || undefined} maxDate={today} />
          <Button variant="outline" onClick={() => setFilters({ date_from: "", date_to: "" })}>Reset</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Collections</p><p className="mt-1 text-2xl font-bold text-primary">₹{(analytics?.totalCollections || 0).toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Refunds</p><p className="mt-1 text-2xl font-bold text-destructive">₹{(analytics?.totalRefunds || 0).toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Net Collections</p><p className="mt-1 text-2xl font-bold">₹{(analytics?.netCollections || 0).toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Discount Given</p><p className="mt-1 text-2xl font-bold text-success">₹{(analytics?.totalDiscountGiven || 0).toLocaleString()}</p></div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-lg font-semibold">Revenue Over Time</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.revenueSeries || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`₹${Number(value || 0).toLocaleString()}`, "Revenue"]} />
                  <Area dataKey="amount" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-lg font-semibold">Revenue By Payment Mode</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.revenueByMode || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mode" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`₹${Number(value || 0).toLocaleString()}`, "Amount"]} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-lg font-semibold">Sales By Package</h3>
            <div className="space-y-3">
              {(analytics?.salesByPackage || []).map((item) => (
                <div key={item.package_name} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                  <span>{item.package_name}</span>
                  <span className="font-medium text-primary">₹{item.amount.toLocaleString()}</span>
                </div>
              ))}
              {!loading && !(analytics?.salesByPackage || []).length ? <p className="text-sm text-muted-foreground">No package analytics available.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-lg font-semibold">Coupon Impact</h3>
            <div className="space-y-3">
              {(analytics?.couponBreakdown || []).map((item) => (
                <div key={item.coupon_code} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                  <span>{item.coupon_code}</span>
                  <span className="font-medium text-success">₹{item.discount_amount.toLocaleString()}</span>
                </div>
              ))}
              {!loading && !(analytics?.couponBreakdown || []).length ? <p className="text-sm text-muted-foreground">No coupon discounts in the selected range.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
