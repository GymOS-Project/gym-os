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
import { isDateAfter, todayDateValue } from "@/lib/date";
import { Pencil, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TransactionsPage() {
  const { admin, selectedGymId } = useAuth();
  const [txns, setTxns] = useState<(Transaction & { members?: { name: string; phone: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ type: "payment", amount: "", payment_mode: "cash", description: "", transaction_date: todayDateValue() });
  const today = todayDateValue();

  useEffect(() => { if (admin) fetchTxns(); }, [admin, selectedGymId]);

  const fetchTxns = async () => {
    if (!admin) return;
    setLoading(true);
    try { setTxns(await api.getTransactions()); }
    catch { toast.error("Failed to load transactions"); }
    setLoading(false);
  };

  const filtered = txns.filter((t) => {
    const matchSearch = t.members?.name?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const total = filtered.filter((t) => t.type === "payment").reduce((sum, t) => sum + Number(t.amount), 0);
  const refunds = filtered.filter((t) => t.type === "refund").reduce((sum, t) => sum + Number(t.amount), 0);

  const openEdit = (transaction: Transaction) => {
    setEditingTxn(transaction);
    setForm({
      type: transaction.type || "payment",
      amount: String(transaction.amount || 0),
      payment_mode: transaction.payment_mode || "cash",
      description: transaction.description || "",
      transaction_date: transaction.transaction_date?.slice(0, 10) || today,
    });
  };

  const handleSave = async () => {
    if (!editingTxn) return;
    if (!form.amount || !form.payment_mode || !form.transaction_date) {
      toast.error("Amount, payment mode, and date are required");
      return;
    }
    if (isDateAfter(form.transaction_date, today)) {
      toast.error("Transaction date cannot be in the future");
      return;
    }
    setSaving(true);
    try {
      await api.updateTransaction(editingTxn.id, {
        type: form.type as Transaction["type"],
        amount: Number(form.amount || 0),
        payment_mode: form.payment_mode as Transaction["payment_mode"],
        description: form.description || null,
        transaction_date: form.transaction_date,
      });
      toast.success("Transaction updated");
      setEditingTxn(null);
      fetchTxns();
    } catch { toast.error("Failed to update transaction"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(deleteId);
      toast.success("Transaction deleted");
      setDeleteId(null);
      fetchTxns();
    } catch { toast.error("Failed to delete transaction"); }
    setDeleting(false);
  };

  return (
    <AppLayout title="Transactions">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground mt-0.5">All financial transactions</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{total.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Refunds</p>
            <p className="text-2xl font-bold text-destructive mt-1">₹{refunds.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Net Revenue</p>
            <p className="text-2xl font-bold mt-1">₹{(total - refunds).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell><p className="font-medium text-sm">{t.members?.name || "—"}</p></TableCell>
                  <TableCell>
                    <Badge className={t.type === "payment" ? "badge-success" : t.type === "refund" ? "badge-destructive" : "badge-secondary"}>{t.type}</Badge>
                  </TableCell>
                  <TableCell className={`font-medium ${t.type === "refund" ? "text-destructive" : "text-primary"}`}>
                    {t.type === "refund" ? "-" : ""}₹{Number(t.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{t.payment_mode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(t.id)}>
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
      <Dialog open={Boolean(editingTxn)} onOpenChange={(open) => !open && setEditingTxn(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['payment', 'refund', 'adjustment'].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} />
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
              <Label>Date</Label>
              <DatePicker value={form.transaction_date} onChange={(value) => setForm((current) => ({ ...current, transaction_date: value }))} maxDate={today} allowClear={false} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTxn(null)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update Transaction"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete transaction?"
        description="This transaction will be permanently deleted. This action cannot be undone."
        onConfirm={handleDelete}
        confirmDisabled={deleting}
      />
    </AppLayout>
  );
}
