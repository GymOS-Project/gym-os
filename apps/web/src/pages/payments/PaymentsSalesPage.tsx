import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { todayDateValue } from "@/lib/date";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function PaymentsSalesPage() {
  const today = todayDateValue();
  const { admin, selectedGymId } = useAuth();
  const [sales, setSales] = useState<(MemberPackage & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ date_from: "", date_to: "", status: "all", package_type_id: "all" });

  const fetchSales = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await api.getPaymentSales({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        package_type_id: filters.package_type_id !== "all" ? filters.package_type_id : undefined,
      });
      setSales(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    fetchSales();
    api.getPlans().then(setPackageTypes).catch(() => {});
  }, [admin, selectedGymId, filters.date_from, filters.date_to, filters.status, filters.package_type_id]);

  const filteredSales = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return sales.filter((sale) => !search || sale.members?.name?.toLowerCase().includes(lowerSearch) || sale.members?.phone?.includes(search) || sale.package_name.toLowerCase().includes(lowerSearch));
  }, [sales, search]);

  const metrics = useMemo(() => ({
    gross: filteredSales.reduce((sum, sale) => sum + Number(sale.gross_amount ?? sale.amount_paid ?? 0), 0),
    discounts: filteredSales.reduce((sum, sale) => sum + Number(sale.discount_amount ?? 0), 0),
    net: filteredSales.reduce((sum, sale) => sum + Number(sale.net_amount ?? sale.amount_paid ?? 0), 0),
  }), [filteredSales]);

  return (
    <AppLayout title="Payments Sales">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Sales</h1>
              <p className="mt-0.5 text-muted-foreground">Review package sales, renewals, discounts, and net collections.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadCsv("payments-sales.csv", filteredSales.map((sale) => ({
              member_name: sale.members?.name || "",
              member_phone: sale.members?.phone || "",
              package_name: sale.package_name,
              start_date: sale.start_date,
              end_date: sale.end_date,
              gross_amount: Number(sale.gross_amount ?? sale.amount_paid ?? 0),
              discount_amount: Number(sale.discount_amount ?? 0),
              net_amount: Number(sale.net_amount ?? sale.amount_paid ?? 0),
              payment_mode: sale.payment_mode,
              status: sale.status,
            })))}
            disabled={filteredSales.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Gross Sales</p><p className="mt-1 text-2xl font-bold">₹{metrics.gross.toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Discounts</p><p className="mt-1 text-2xl font-bold text-success">₹{metrics.discounts.toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Net Sales</p><p className="mt-1 text-2xl font-bold text-primary">₹{metrics.net.toLocaleString()}</p></div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member or package" className="pl-9" />
          </div>
          <DatePicker value={filters.date_from} onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))} placeholder="From date" maxDate={filters.date_to || today} />
          <DatePicker value={filters.date_to} onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))} placeholder="To date" minDate={filters.date_from || undefined} maxDate={today} />
          <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.package_type_id} onValueChange={(value) => setFilters((current) => ({ ...current, package_type_id: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packages</SelectItem>
              {packageTypes.map((pkg) => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No sales found.</TableCell></TableRow>
              ) : filteredSales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/30">
                  <TableCell><p className="font-medium text-sm">{sale.members?.name || "-"}</p><p className="text-xs text-muted-foreground">{sale.members?.phone || ""}</p></TableCell>
                  <TableCell className="text-sm">{sale.package_name}</TableCell>
                  <TableCell className="text-sm">{new Date(sale.start_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{new Date(sale.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">₹{Number(sale.gross_amount ?? sale.amount_paid ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-success">₹{Number(sale.discount_amount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-primary">₹{Number(sale.net_amount ?? sale.amount_paid ?? 0).toLocaleString()}</TableCell>
                  <TableCell><Badge className={sale.status === "active" ? "badge-success" : sale.status === "expired" ? "badge-destructive" : "badge-secondary"}>{sale.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
