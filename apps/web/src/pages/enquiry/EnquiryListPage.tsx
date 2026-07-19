import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Trash2, Phone, UserCheck, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Enquiry } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EnquiryListPageProps {
  filterStatus?: string;
  title: string;
  description: string;
}

export default function EnquiryListPage({ filterStatus, title, description }: EnquiryListPageProps) {
  const { admin, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [followupDialog, setFollowupDialog] = useState<Enquiry | null>(null);
  const [fuForm, setFuForm] = useState({ next_followup_date: "", notes: "", status: "done" as const });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (admin) fetchEnquiries(); }, [admin, filterStatus, selectedGymId]);

  const fetchEnquiries = async () => {
    if (!admin) return;
    setLoading(true);
    try { setEnquiries(await api.getEnquiries(filterStatus)); }
    catch { toast.error("Failed to load enquiries"); }
    setLoading(false);
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = {
      new: "badge-primary",
      contacted: "badge-secondary",
      follow_up: "badge-warning",
      converted: "badge-success",
      not_interested: "badge-destructive",
    };
    const labels: Record<string, string> = { new: "New", contacted: "Contacted", follow_up: "Follow Up", converted: "Converted", not_interested: "Not Interested" };
    return <Badge className={cfg[s] || ""}>{labels[s] || s}</Badge>;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await api.deleteEnquiry(deleteId); toast.success("Enquiry deleted"); fetchEnquiries(); }
    catch { toast.error("Failed to delete"); }
    setDeleteId(null);
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.updateEnquiry(id, { status: status as any }); toast.success("Status updated"); fetchEnquiries(); }
    catch { toast.error("Failed to update"); }
  };

  const handleFollowup = async () => {
    if (!followupDialog || !admin) return;
    setSaving(true);
    try {
      await api.addEnquiryFollowup(followupDialog.id, {
        gym_id: followupDialog.gym_id,
        followup_date: new Date().toISOString().split("T")[0],
        next_followup_date: fuForm.next_followup_date || undefined,
        notes: fuForm.notes || undefined,
        status: fuForm.status,
      });
      if (fuForm.next_followup_date) {
        await api.updateEnquiry(followupDialog.id, { status: "follow_up", next_followup_date: fuForm.next_followup_date });
      }
      toast.success("Follow-up recorded");
      setFollowupDialog(null);
      fetchEnquiries();
    } catch { toast.error("Failed to save follow-up"); }
    setSaving(false);
  };

  const filtered = enquiries.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  );

  return (
    <AppLayout title={title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          {!filterStatus && (
            <Button onClick={() => navigate("/enquiry/add")} variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" /> Add Enquiry
            </Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No enquiries found</TableCell></TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{e.name[0].toUpperCase()}</div>
                      <p className="font-medium">{e.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.phone}</TableCell>
                  <TableCell className="text-sm capitalize">{e.source?.replace("_", " ") || "—"}</TableCell>
                  <TableCell className="text-sm">{e.interest || "—"}</TableCell>
                  <TableCell className="text-sm">{e.next_followup_date ? new Date(e.next_followup_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.open(`tel:${e.phone}`)}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-warning hover:bg-warning/10 hover:text-warning" onClick={() => { setFollowupDialog(e); setFuForm({ next_followup_date: "", notes: "", status: "done" }); }}>
                        <PhoneCall className="h-3.5 w-3.5" />
                      </Button>
                      {e.status !== "converted" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10 hover:text-success" onClick={() => updateStatus(e.id, "converted")}>
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(e.id)}>
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

      <Dialog open={!!followupDialog} onOpenChange={() => setFollowupDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Follow-up for {followupDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Next Follow-up Date</Label>
              <Input type="date" value={fuForm.next_followup_date} onChange={(e) => setFuForm((p) => ({ ...p, next_followup_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={fuForm.notes} onChange={(e) => setFuForm((p) => ({ ...p, notes: e.target.value }))} placeholder="What was discussed?" />
            </div>
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={fuForm.status} onValueChange={(v) => setFuForm((p) => ({ ...p, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Contacted</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialog(null)}>Cancel</Button>
            <Button onClick={handleFollowup} variant="gradient" disabled={saving}>{saving ? "Saving..." : "Save Follow-up"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this enquiry and all its follow-ups.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
