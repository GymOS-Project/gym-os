import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isDateTimeBefore, nowDateTimeLocalValue } from "@/lib/date";
import { EMPTY_PT_SESSION_FORM } from "@/utils/constants";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PTSessionsPage() {
  const now = nowDateTimeLocalValue();
  const { gyms, selectedGymId } = useAuth();
  const [sessions, setSessions] = useState<PtSession[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string; gym_id: string }[]>([]);
  const [form, setForm] = useState({ ...EMPTY_PT_SESSION_FORM });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PtSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [sessionData, staffData, memberData] = await Promise.all([
        api.getPtSessions(),
        api.getStaff(),
        api.getActiveMembers(),
      ]);
      setSessions(sessionData);
      setStaff(staffData);
      setMembers(memberData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load PT sessions");
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

  const staffMap = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff]);
  const memberMap = useMemo(() => new Map(members.map((item) => [item.id, item])), [members]);

  const openCreate = () => {
    setEditingSession(null);
    setForm({ ...EMPTY_PT_SESSION_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (session: PtSession) => {
    setEditingSession(session);
    setForm({
      gym_id: session.gym_id,
      trainer_staff_id: session.trainer_staff_id,
      member_id: session.member_id,
      scheduled_at: session.scheduled_at.slice(0, 16),
      duration_minutes: String(session.duration_minutes || 60),
      status: session.status,
      notes: session.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.gym_id || !form.trainer_staff_id || !form.member_id || !form.scheduled_at) {
      toast.error("Gym, trainer, member, and schedule are required");
      return;
    }
    if (form.status === "scheduled" && isDateTimeBefore(form.scheduled_at, now)) {
      toast.error("Scheduled PT sessions cannot be set in the past");
      return;
    }

    const payload = {
      gym_id: form.gym_id,
      trainer_staff_id: form.trainer_staff_id,
      member_id: form.member_id,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes || 60),
      status: form.status,
      notes: form.notes || null,
    };

    try {
      if (editingSession) {
        await api.updatePtSession(editingSession.id, payload);
        toast.success("PT session updated");
      } else {
        await api.createPtSession(payload);
        toast.success("PT session created");
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save PT session");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deletePtSession(deleteId);
      toast.success("PT session deleted");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete PT session");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="PT Sessions">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">PT and Trainer Scheduling</h1>
            <p className="mt-1 text-muted-foreground">Assign trainers to members, schedule sessions, and track completion status.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New PT Session</Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Trainer</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No PT sessions yet.</TableCell></TableRow>
              ) : sessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/30">
                  <TableCell>{staffMap.get(session.trainer_staff_id)?.full_name || "Unknown"}</TableCell>
                  <TableCell>{memberMap.get(session.member_id)?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <p>{new Date(session.scheduled_at).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{session.duration_minutes} mins</p>
                  </TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(session)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(session.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingSession ? "Edit PT Session" : "Create PT Session"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>{gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trainer</Label>
              <Select value={form.trainer_staff_id} onValueChange={(value) => setForm((current) => ({ ...current, trainer_staff_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>{staff.filter((item) => !form.gym_id || item.gym_id === form.gym_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name} ({item.role})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={form.member_id} onValueChange={(value) => setForm((current) => ({ ...current, member_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.filter((item) => !form.gym_id || item.gym_id === form.gym_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <Input type="datetime-local" min={form.status === "scheduled" ? now : undefined} value={form.scheduled_at} onChange={(e) => setForm((current) => ({ ...current, scheduled_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" min="15" step="15" value={form.duration_minutes} onChange={(e) => setForm((current) => ({ ...current, duration_minutes: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave}>{editingSession ? "Update Session" : "Create Session"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete PT session?" description="This removes the trainer booking from the system." onConfirm={handleDelete} />
    </AppLayout>
  );
}
