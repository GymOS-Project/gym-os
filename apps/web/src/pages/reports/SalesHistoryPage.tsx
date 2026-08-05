import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isDateBefore } from "@/lib/date";
import { ChartBar as BarChart2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SalesHistoryPage() {
  const { admin, selectedGymId } = useAuth();
  const [sales, setSales] = useState<(MemberPackage & { members?: { name: string; phone: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [editingSale, setEditingSale] = useState<MemberPackage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ package_name: "", start_date: "", end_date: "", amount_paid: "", payment_mode: "cash", status: "active", notes: "" });

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
    const cfg: Record<string, string> = { active: "badge-success", expired: "badge-destructive", cancelled: "badge-secondary", paused: "badge-warning" };
    return <Badge className={cfg[s] || ""}>{s}</Badge>;
  };

  const handleLifecycle = async (sale: MemberPackage, action: "pause" | "resume" | "cancel") => {
    const notes = window.prompt(`${action[0].toUpperCase()}${action.slice(1)} notes`, "") || undefined;
    try {
      if (action === "pause") await api.pauseMemberPackage(sale.id, notes);
      if (action === "resume") await api.resumeMemberPackage(sale.id, notes);
      if (action === "cancel") await api.cancelMemberPackage(sale.id, notes);
      toast.success(`Membership ${action}d`);
      fetchSales();
    } catch { toast.error(`Failed to ${action} membership`); }
  };

  const openEdit = (sale: MemberPackage) => {
    setEditingSale(sale);
    setForm({
      package_name: sale.package_name || "",
      start_date: sale.start_date || "",
      end_date: sale.end_date || "",
      amount_paid: String(sale.amount_paid || 0),
      payment_mode: sale.payment_mode || "cash",
      status: sale.status || "active",
      notes: sale.notes || "",
    });
  };

  const handleSave = async () => {
    if (!editingSale) return;
    if (!form.package_name || !form.start_date || !form.end_date) {
      toast.error("Package name, start date, and end date are required");
      return;
    }
    if (isDateBefore(form.end_date, form.start_date)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    try {
      await api.updateMemberPackage(editingSale.id, {
        package_name: form.package_name,
        start_date: form.start_date,
        end_date: form.end_date,
        amount_paid: Number(form.amount_paid || 0),
        payment_mode: form.payment_mode as MemberPackage["payment_mode"],
        status: form.status as MemberPackage["status"],
        notes: form.notes || null,
      });
      toast.success("Sale updated");
      setEditingSale(null);
      fetchSales();
    } catch { toast.error("Failed to update sale"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteMemberPackage(deleteId);
      toast.success("Sale deleted");
      setDeleteId(null);
      fetchSales();
    } catch { toast.error("Failed to delete sale"); }
    setDeleting(false);
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No sales records</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell><p className="font-medium">{s.members?.name}</p><p className="text-xs text-muted-foreground">{s.members?.phone}</p></TableCell>
                  <TableCell className="text-sm">{s.package_name}</TableCell>
                  <TableCell className="text-sm">{new Date(s.start_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{new Date(s.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-primary">₹{Number(s.amount_paid).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize">{s.payment_mode}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.status === "active" && <Button size="sm" variant="outline" onClick={() => handleLifecycle(s, "pause")}>Pause</Button>}
                      {s.status === "paused" && <Button size="sm" variant="outline" onClick={() => handleLifecycle(s, "resume")}>Resume</Button>}
                      {s.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => handleLifecycle(s, "cancel")}>Cancel</Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={Boolean(editingSale)} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Sale</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Package Name</Label>
              <Input value={form.package_name} onChange={(e) => setForm((current) => ({ ...current, package_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <DatePicker value={form.start_date} onChange={(value) => setForm((current) => ({ ...current, start_date: value }))} allowClear={false} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <DatePicker value={form.end_date} onChange={(value) => setForm((current) => ({ ...current, end_date: value }))} minDate={form.start_date || undefined} allowClear={false} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" value={form.amount_paid} onChange={(e) => setForm((current) => ({ ...current, amount_paid: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={(value) => setForm((current) => ({ ...current, payment_mode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash', 'card', 'upi', 'bank_transfer', 'other'].map((mode) => <SelectItem key={mode} value={mode}>{mode.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['active', 'expired', 'cancelled'].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSale(null)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update Sale"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete sale?"
        description="This member package sale will be permanently deleted. This action cannot be undone."
        onConfirm={handleDelete}
        confirmDisabled={deleting}
      />
    </AppLayout>
  );
}
