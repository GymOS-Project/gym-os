import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isDateAfter, isDateBefore, todayDateValue } from "@/lib/date";
import { EMPTY_INVOICE_FORM } from "@/utils/constants";
import { Download, FileText, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

export default function InvoicesPage() {
  const today = todayDateValue();
  const { gyms, selectedGymId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string; gym_id: string }[]>([]);
  const [form, setForm] = useState({ ...EMPTY_INVOICE_FORM });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const fetchData = async () => {
    try {
      const [invoiceData, memberData] = await Promise.all([api.getInvoices(), api.getActiveMembers()]);
      setInvoices(invoiceData);
      setMembers(memberData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invoices");
    }
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""),
    }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    fetchData();
  }, [selectedGymId]);

  const totalAmount = useMemo(() => Number(form.subtotal || 0) + Number(form.tax_amount || 0) - Number(form.discount_amount || 0), [form.discount_amount, form.subtotal, form.tax_amount]);

  const openCreate = () => {
    setEditingInvoice(null);
    setForm({ ...EMPTY_INVOICE_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      gym_id: invoice.gym_id,
      member_id: invoice.member_id || "",
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || "",
      subtotal: String(invoice.subtotal || 0),
      tax_amount: String(invoice.tax_amount || 0),
      discount_amount: String(invoice.discount_amount || 0),
      gstin: String((invoice.line_items?.[0] as any)?.gstin || ""),
      place_of_supply: String((invoice.line_items?.[0] as any)?.place_of_supply || ""),
      hsn_sac: String((invoice.line_items?.[0] as any)?.hsn_sac || "9997"),
      notes: invoice.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.gym_id) {
      toast.error("Gym is required");
      return;
    }
    if (isDateAfter(form.issue_date, today)) {
      toast.error("Issue date cannot be in the future");
      return;
    }
    if (form.due_date && isDateBefore(form.due_date, form.issue_date)) {
      toast.error("Due date cannot be before the issue date");
      return;
    }

    const payload = {
      gym_id: form.gym_id,
      member_id: form.member_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      subtotal: Number(form.subtotal || 0),
      tax_amount: Number(form.tax_amount || 0),
      discount_amount: Number(form.discount_amount || 0),
      notes: form.notes || null,
      line_items: [{ label: "Gym service", amount: Number(form.subtotal || 0), gstin: form.gstin || null, place_of_supply: form.place_of_supply || null, hsn_sac: form.hsn_sac || null }],
    };

    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, payload);
        toast.success("Invoice updated");
      } else {
        await api.createInvoice(payload);
        toast.success("Invoice created");
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save invoice");
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await api.markInvoicePaid(invoiceId);
      toast.success("Invoice marked as paid");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark invoice paid");
    }
  };

  const handleDownloadReceipt = async (invoice: Invoice) => {
    try {
      await api.downloadInvoiceReceipt(invoice.id, `${invoice.receipt_number || invoice.invoice_number}.pdf`);
      toast.success("PDF downloaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to download receipt");
    }
  };

  const handleEmailReceipt = async (invoice: Invoice) => {
    const member = members.find((item) => item.id === invoice.member_id);
    const email = window.prompt("Send receipt to email address", "");
    if (email === null) return;

    try {
      await api.emailInvoiceReceipt(invoice.id, email.trim() || undefined);
      toast.success(`Receipt emailed${member ? ` for ${member.name}` : ""}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to email receipt");
    }
  };

  return (
    <AppLayout title="Invoices">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Invoices and Receipts</h1>
            <p className="mt-1 text-muted-foreground">Generate tax-ready invoices, mark them paid, and issue receipt numbers automatically.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New Invoice</Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Invoice</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No invoices generated yet.</TableCell></TableRow>
              ) : invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(invoice)}>
                  <TableCell>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{invoice.receipt_number || "Receipt pending"}</p>
                  </TableCell>
                  <TableCell>{members.find((member) => member.id === invoice.member_id)?.name || "Walk-in / General"}</TableCell>
                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>₹{Number(invoice.total_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{invoice.status}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(invoice)}>Edit</Button>
                      {invoice.status !== "paid" && <Button size="sm" onClick={() => handleMarkPaid(invoice.id)}><FileText className="mr-1 h-3.5 w-3.5" /> Mark Paid</Button>}
                      <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(invoice)}><Download className="mr-1 h-3.5 w-3.5" /> Download</Button>
                      <Button size="sm" variant="outline" onClick={() => handleEmailReceipt(invoice)}><Mail className="mr-1 h-3.5 w-3.5" /> Email</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingInvoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>{gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Member</Label>
              <Select value={form.member_id || "__none__"} onValueChange={(value) => setForm((current) => ({ ...current, member_id: value === "__none__" ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">General / Walk-in</SelectItem>
                  {members.filter((member) => !form.gym_id || member.gym_id === form.gym_id).map((member) => <SelectItem key={member.id} value={member.id}>{member.name} - {member.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" max={today} value={form.issue_date} onChange={(e) => setForm((current) => ({ ...current, issue_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" min={form.issue_date || undefined} value={form.due_date} onChange={(e) => setForm((current) => ({ ...current, due_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Subtotal</Label><Input type="number" value={form.subtotal} onChange={(e) => setForm((current) => ({ ...current, subtotal: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Tax</Label><Input type="number" value={form.tax_amount} onChange={(e) => setForm((current) => ({ ...current, tax_amount: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Discount</Label><Input type="number" value={form.discount_amount} onChange={(e) => setForm((current) => ({ ...current, discount_amount: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Total</Label><Input value={`₹${totalAmount.toLocaleString()}`} disabled className="bg-muted" /></div>
            <div className="space-y-1.5"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm((current) => ({ ...current, gstin: e.target.value }))} placeholder="Customer GSTIN" /></div>
            <div className="space-y-1.5"><Label>Place of Supply</Label><Input value={form.place_of_supply} onChange={(e) => setForm((current) => ({ ...current, place_of_supply: e.target.value }))} placeholder="State" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>HSN/SAC</Label><Input value={form.hsn_sac} onChange={(e) => setForm((current) => ({ ...current, hsn_sac: e.target.value }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave}>{editingInvoice ? "Update Invoice" : "Create Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
