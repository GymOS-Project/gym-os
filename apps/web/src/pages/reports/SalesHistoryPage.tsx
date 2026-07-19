import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartBar as BarChart2 } from "lucide-react";
import { toast } from "sonner";
import type { MemberPackage } from "@/types";

export default function SalesHistoryPage() {
  const { admin, selectedGymId } = useAuth();
  const [sales, setSales] = useState<(MemberPackage & { members?: { name: string; phone: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => { if (admin) fetchSales(); }, [admin, selectedGymId]);

  const fetchSales = async () => {
    if (!admin) return;
    setLoading(true);
    try { setSales(await api.getMemberPackages()); }
    catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("default", { month: "long", year: "numeric" }) };
  });

  const filtered = sales.filter((s) => {
    const matchSearch = s.members?.name?.toLowerCase().includes(search.toLowerCase()) || s.members?.phone?.includes(search);
    const matchMonth = monthFilter === "all" || s.created_at.startsWith(monthFilter);
    return matchSearch && matchMonth;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = { active: "badge-success", expired: "badge-destructive", cancelled: "badge-secondary" };
    return <Badge className={cfg[s] || ""}>{s}</Badge>;
  };

  return (
    <AppLayout title="Sales History">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sales History</h1>
            <p className="text-muted-foreground mt-0.5">All membership sales and renewals</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Filtered Revenue</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Avg. Sale</p>
            <p className="text-2xl font-bold mt-1">₹{filtered.length ? Math.round(totalRevenue / filtered.length).toLocaleString() : 0}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search member..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No sales records</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell><p className="font-medium">{s.members?.name}</p><p className="text-xs text-muted-foreground">{s.members?.phone}</p></TableCell>
                  <TableCell className="text-sm">{s.package_name}</TableCell>
                  <TableCell className="text-sm">{new Date(s.start_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{new Date(s.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-primary">₹{Number(s.amount_paid).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize">{s.payment_mode}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
