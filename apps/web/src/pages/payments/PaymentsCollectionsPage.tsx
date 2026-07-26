import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsCollectionsPage() {
  const { admin, selectedGymId } = useAuth();
  const [collections, setCollections] = useState<(Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ date_from: "", date_to: "", type: "all", payment_mode: "all" });
  const [form, setForm] = useState({ member_id: "", type: "payment", amount: "", payment_mode: "cash", description: "", transaction_date: "" });

  const fetchCollections = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await api.getPaymentCollections({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        type: filters.type !== "all" ? filters.type : undefined,
        payment_mode: filters.payment_mode !== "all" ? filters.payment_mode : undefined,
      });
      setCollections(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    fetchCollections();
    api.getActiveMembers().then(setMembers).catch(() => {});
  }, [admin, selectedGymId, filters.date_from, filters.date_to, filters.type, filters.payment_mode]);

  const filteredCollections = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return collections.filter((item) =>
      !search
      || item.members?.name?.toLowerCase().includes(lowerSearch)
      || item.members?.phone?.includes(search)
      || item.description?.toLowerCase().includes(lowerSearch),
    );
  }, [collections, search]);

  const totals = useMemo(() => ({
    payments: filteredCollections.filter((item) => item.type === "payment").reduce((sum, item) => sum + Number(item.net_amount ?? item.amount ?? 0), 0),
    refunds: filteredCollections.filter((item) => item.type === "refund").reduce((sum, item) => sum + Number(item.net_amount ?? item.amount ?? 0), 0),
    adjustments: filteredCollections.filter((item) => item.type === "adjustment").reduce((sum, item) => sum + Number(item.net_amount ?? item.amount ?? 0), 0),
  }), [filteredCollections]);

  const handleCreate = async () => {
    if (!form.amount || !form.payment_mode) {
      toast.error("Amount and payment mode are required");
      return;
    }

    setSaving(true);
    try {
      await api.createPaymentCollection({
        member_id: form.member_id || null,
        type: form.type as Transaction["type"],
        amount: Number(form.amount),
        payment_mode: form.payment_mode as Transaction["payment_mode"],
        description: form.description || null,
        transaction_date: form.transaction_date || null,
      });
      toast.success("Payment created");
      setDialogOpen(false);
      setForm({ member_id: "", type: "payment", amount: "", payment_mode: "cash", description: "", transaction_date: "" });
      await fetchCollections();
    } catch (error: any) {
      toast.error(error.message || "Failed to create payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Payments Collections">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <Receipt className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Collections</h1>
              <p className="mt-0.5 text-muted-foreground">Track all incoming payments, refunds, and adjustments.</p>
            </div>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Create Payment</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Payments</p><p className="mt-1 text-2xl font-bold text-primary">₹{totals.payments.toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Refunds</p><p className="mt-1 text-2xl font-bold text-destructive">₹{totals.refunds.toLocaleString()}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Net</p><p className="mt-1 text-2xl font-bold">₹{(totals.payments - totals.refunds + totals.adjustments).toLocaleString()}</p></div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member or note" className="pl-9" />
          </div>
          <DatePicker value={filters.date_from} onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))} placeholder="From date" />
          <DatePicker value={filters.date_to} onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))} placeholder="To date" />
          <Select value={filters.type} onValueChange={(value) => setFilters((current) => ({ ...current, type: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.payment_mode} onValueChange={(value) => setFilters((current) => ({ ...current, payment_mode: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredCollections.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No collections found.</TableCell></TableRow>
              ) : filteredCollections.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{new Date(item.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell><p className="font-medium text-sm">{item.members?.name || "-"}</p><p className="text-xs text-muted-foreground">{item.members?.phone || ""}</p></TableCell>
                  <TableCell><Badge className={item.type === "payment" ? "badge-success" : item.type === "refund" ? "badge-destructive" : "badge-secondary"}>{item.type}</Badge></TableCell>
                  <TableCell className="text-sm">₹{Number(item.gross_amount ?? item.amount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-success">₹{Number(item.discount_amount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-primary">₹{Number(item.net_amount ?? item.amount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize">{item.payment_mode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Payment</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Member</Label>
                <Select value={form.member_id || "__none__"} onValueChange={(value) => setForm((current) => ({ ...current, member_id: value === "__none__" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select member (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Member</SelectItem>
                    {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name} - {member.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select value={form.payment_mode} onValueChange={(value) => setForm((current) => ({ ...current, payment_mode: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction Date</Label>
                  <DatePicker value={form.transaction_date} onChange={(value) => setForm((current) => ({ ...current, transaction_date: value }))} placeholder="Select date" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Optional note" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="gradient" onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create Payment"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
