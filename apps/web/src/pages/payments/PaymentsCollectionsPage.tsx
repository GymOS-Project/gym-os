import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { isDateAfter, isDateBefore, todayDateValue } from "@/lib/date";
import { Pencil, Plus, Receipt, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsCollectionsPage() {
  const today = todayDateValue();
  const { admin, selectedGymId } = useAuth();
  const [collections, setCollections] = useState<(Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<(Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null }) | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ date_from: "", date_to: "", type: "all", payment_mode: "all" });
  const [form, setForm] = useState({ member_id: "", type: "payment", amount: "", payment_mode: "cash", description: "", transaction_date: "" });
  const [refundForm, setRefundForm] = useState({ amount: "", description: "", transaction_date: "" });

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
    if (form.transaction_date && isDateAfter(form.transaction_date, today)) {
      toast.error("Transaction date cannot be in the future");
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

  const openEdit = (transaction: (Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })) => {
    setSelectedTransaction(transaction);
    setForm({
      member_id: transaction.member_id || "",
      type: transaction.type,
      amount: String(transaction.amount ?? 0),
      payment_mode: transaction.payment_mode,
      description: transaction.description || "",
      transaction_date: transaction.transaction_date || "",
    });
    setEditDialogOpen(true);
  };

  const openRefund = (transaction: (Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })) => {
    setSelectedTransaction(transaction);
    setRefundForm({
      amount: String(transaction.net_amount ?? transaction.amount ?? 0),
      description: `Refund for ${transaction.members?.name || "payment"}`,
      transaction_date: "",
    });
    setRefundDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTransaction || !form.amount || !form.payment_mode) {
      toast.error("Amount and payment mode are required");
      return;
    }
    if (form.transaction_date && isDateAfter(form.transaction_date, today)) {
      toast.error("Transaction date cannot be in the future");
      return;
    }

    setSaving(true);
    try {
      await api.updatePaymentCollection(selectedTransaction.id, {
        member_id: form.member_id || null,
        type: form.type as Transaction["type"],
        amount: Number(form.amount),
        payment_mode: form.payment_mode as Transaction["payment_mode"],
        description: form.description || null,
        transaction_date: form.transaction_date || null,
      });
      toast.success("Payment updated");
      setEditDialogOpen(false);
      setSelectedTransaction(null);
      await fetchCollections();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction || !refundForm.amount) {
      toast.error("Refund amount is required");
      return;
    }
    if (refundForm.transaction_date && isDateAfter(refundForm.transaction_date, today)) {
      toast.error("Refund date cannot be in the future");
      return;
    }
    if (refundForm.transaction_date && selectedTransaction.transaction_date && isDateBefore(refundForm.transaction_date, selectedTransaction.transaction_date.slice(0, 10))) {
      toast.error("Refund date cannot be before the original transaction date");
      return;
    }

    setSaving(true);
    try {
      await api.refundPaymentCollection(selectedTransaction.id, {
        amount: Number(refundForm.amount),
        description: refundForm.description || null,
        transaction_date: refundForm.transaction_date || null,
      });
      toast.success("Refund created");
      setRefundDialogOpen(false);
      setSelectedTransaction(null);
      await fetchCollections();
    } catch (error: any) {
      toast.error(error.message || "Failed to create refund");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.deletePaymentCollection(deleteId);
      toast.success("Payment deleted");
      setDeleteId(null);
      await fetchCollections();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment");
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadCsv("payments-collections.csv", filteredCollections.map((item) => ({
                date: item.transaction_date,
                member_name: item.members?.name || "",
                member_phone: item.members?.phone || "",
                type: item.type,
                gross_amount: Number(item.gross_amount ?? item.amount ?? 0),
                discount_amount: Number(item.discount_amount ?? 0),
                net_amount: Number(item.net_amount ?? item.amount ?? 0),
                payment_mode: item.payment_mode,
                description: item.description || "",
              })))}
              disabled={filteredCollections.length === 0}
            >
              Export CSV
            </Button>
            <Button variant="gradient" className="gap-2" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Create Payment</Button>
          </div>
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
          <DatePicker value={filters.date_from} onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))} placeholder="From date" maxDate={filters.date_to || today} />
          <DatePicker value={filters.date_to} onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))} placeholder="To date" minDate={filters.date_from || undefined} maxDate={today} />
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredCollections.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground">No collections found.</TableCell></TableRow>
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
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!item.member_package_id && !item.package_sale_id && Number(item.discount_amount ?? 0) === 0 ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : null}
                      {item.type === "payment" ? (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openRefund(item)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
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
                  <DatePicker value={form.transaction_date} onChange={(value) => setForm((current) => ({ ...current, transaction_date: value }))} placeholder="Select date" maxDate={today} />
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

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Edit Payment</DialogTitle></DialogHeader>
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
                  <DatePicker value={form.transaction_date} onChange={(value) => setForm((current) => ({ ...current, transaction_date: value }))} placeholder="Select date" maxDate={today} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Optional note" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button variant="gradient" onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Update Payment"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Refund</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Refund Amount</Label>
                <Input type="number" value={refundForm.amount} onChange={(e) => setRefundForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Refund Date</Label>
                <DatePicker value={refundForm.transaction_date} onChange={(value) => setRefundForm((current) => ({ ...current, transaction_date: value }))} placeholder="Select refund date" minDate={selectedTransaction?.transaction_date?.slice(0, 10) || undefined} maxDate={today} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={refundForm.description} onChange={(e) => setRefundForm((current) => ({ ...current, description: e.target.value }))} placeholder="Refund reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
              <Button variant="gradient" onClick={handleRefund} disabled={saving}>{saving ? "Saving..." : "Create Refund"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete Payment?"
          description="This permanently deletes the selected manual payment entry. Package sale payments cannot be deleted here."
          onConfirm={handleDelete}
          confirmDisabled={saving}
          confirmLabel={saving ? "Deleting..." : "Delete"}
        />
      </div>
    </AppLayout>
  );
}
