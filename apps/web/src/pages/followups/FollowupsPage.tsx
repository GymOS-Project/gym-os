import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CreditCard as Edit, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Followup, Member } from "@/types";

const NO_MEMBER = "__none__";

interface FollowupsPageProps {
  type: "general" | "payment_due" | "renewal";
  title: string;
  description: string;
}

export default function FollowupsPage({ type, title, description }: FollowupsPageProps) {
  const { admin, gyms, selectedGymId } = useAuth();
  const [followups, setFollowups] = useState<(Followup & { members: Member | null })[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string; gym_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFu, setEditFu] = useState<Followup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "", member_id: NO_MEMBER, followup_date: new Date().toISOString().split("T")[0], next_followup_date: "", notes: "", status: "pending" });

  useEffect(() => { if (admin) { fetchFollowups(); fetchMembers(); } }, [admin, selectedGymId, type]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: selectedGymId !== "all" ? selectedGymId : current.gym_id || gyms[0]?.id || "",
    }));
  }, [gyms, selectedGymId]);

  const fetchFollowups = async () => {
    if (!admin) return;
    setLoading(true);
    try { setFollowups(await api.getFollowups(type)); }
    catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!admin) return;
    try { setMembers(await api.getActiveMembers()); }
    catch {}
  };

  const openAdd = () => { setEditFu(null); setForm({ gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "", member_id: NO_MEMBER, followup_date: new Date().toISOString().split("T")[0], next_followup_date: "", notes: "", status: "pending" }); setDialogOpen(true); };
  const openEdit = (fu: Followup) => { setEditFu(fu); setForm({ gym_id: fu.gym_id, member_id: fu.member_id || NO_MEMBER, followup_date: fu.followup_date, next_followup_date: fu.next_followup_date || "", notes: fu.notes || "", status: fu.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!admin) return;
    setSaving(true);
    const payload = { gym_id: form.gym_id, type, member_id: form.member_id !== NO_MEMBER ? form.member_id : undefined, followup_date: form.followup_date, next_followup_date: form.next_followup_date || undefined, notes: form.notes || undefined, status: form.status as any };
    try {
      if (editFu) await api.updateFollowup(editFu.id, payload);
      else await api.createFollowup(payload);
      toast.success(editFu ? "Updated" : "Follow-up added");
      setDialogOpen(false);
      fetchFollowups();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const markDone = async (id: string) => {
    try { await api.updateFollowup(id, { status: "done" }); toast.success("Marked as done"); fetchFollowups(); }
    catch { toast.error("Failed to update"); }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "done": return <Badge className="badge-success">Done</Badge>;
      case "no_response": return <Badge className="badge-secondary">No Response</Badge>;
      default: return <Badge className="badge-warning">Pending</Badge>;
    }
  };

  return (
    <AppLayout title={title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <Button onClick={openAdd} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" /> Add Follow-up
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : followups.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No follow-ups yet</TableCell></TableRow>
              ) : followups.map((fu) => (
                <TableRow key={fu.id} className="hover:bg-muted/30">
                  <TableCell>
                    {fu.members ? (
                      <div><p className="font-medium">{fu.members.name}</p><p className="text-xs text-muted-foreground">{fu.members.phone}</p></div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{new Date(fu.followup_date).toLocaleDateString()}</TableCell>
                  <TableCell>{fu.next_followup_date ? new Date(fu.next_followup_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{fu.notes || "—"}</TableCell>
                  <TableCell>{statusBadge(fu.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {fu.members && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.open(`tel:${fu.members!.phone}`)}>
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {fu.status === "pending" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10 hover:text-success" onClick={() => markDone(fu.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(fu)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editFu ? "Edit Follow-up" : "Add Follow-up"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Gym</Label>
                <Select value={form.gym_id} onValueChange={(v) => setForm((p) => ({ ...p, gym_id: v, member_id: NO_MEMBER }))}>
                  <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                  <SelectContent>
                    {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Member</Label>
                <Select value={form.member_id} onValueChange={(v) => setForm((p) => ({ ...p, member_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MEMBER}>None</SelectItem>
                    {members.filter((m) => !form.gym_id || m.gym_id === form.gym_id).map((m) => <SelectItem key={m.id} value={m.id}>{m.name} — {m.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.followup_date} onChange={(e) => setForm((p) => ({ ...p, followup_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up</Label>
                <Input type="date" value={form.next_followup_date} onChange={(e) => setForm((p) => ({ ...p, next_followup_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes about this follow-up" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="gradient" disabled={saving}>{saving ? "Saving..." : editFu ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
