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
import { isDateBefore, todayDateValue } from "@/lib/date";
import { EMPTY_CLASS_SESSION_FORM } from "@/utils/constants";
import { CalendarDays, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function ClassSchedulePage() {
  const today = todayDateValue();
  const { gyms, selectedGymId } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string; gym_id: string }[]>([]);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [form, setForm] = useState({ ...EMPTY_CLASS_SESSION_FORM });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [bookingSession, setBookingSession] = useState<ClassSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [sessionData, staffData, memberData] = await Promise.all([
        api.getClassSessions(),
        api.getStaff(),
        api.getActiveMembers(),
      ]);
      setSessions(sessionData);
      setStaff(staffData);
      setMembers(memberData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load class schedule");
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

  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const staffMap = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff]);

  const openCreate = () => {
    setEditingSession(null);
    setForm({ ...EMPTY_CLASS_SESSION_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (session: ClassSession) => {
    setEditingSession(session);
    setForm({
      gym_id: session.gym_id,
      name: session.name,
      description: session.description || "",
      trainer_staff_id: session.trainer_staff_id || "",
      capacity: String(session.capacity || 0),
      session_date: session.session_date,
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      recurrence_label: session.recurrence_label || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.gym_id || !form.name || !form.session_date) {
      toast.error("Gym, class name, and date are required");
      return;
    }
    if (isDateBefore(form.session_date, today)) {
      toast.error("Session date cannot be in the past");
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error("End time must be after start time");
      return;
    }

    const payload = {
      gym_id: form.gym_id,
      name: form.name,
      description: form.description || null,
      trainer_staff_id: form.trainer_staff_id || null,
      capacity: Number(form.capacity || 0),
      session_date: form.session_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      recurrence_label: form.recurrence_label || null,
    };

    try {
      if (editingSession) {
        await api.updateClassSession(editingSession.id, payload);
        toast.success("Class session updated");
      } else {
        await api.createClassSession(payload);
        toast.success("Class session created");
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save class session");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteClassSession(deleteId);
      toast.success("Class session deleted");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete class session");
    } finally {
      setDeleteId(null);
    }
  };

  const openBookings = async (session: ClassSession) => {
    setBookingSession(session);
    setSelectedMemberId("");
    setBookingOpen(true);
    try {
      setBookings(await api.getClassBookings(session.id));
    } catch (error: any) {
      toast.error(error.message || "Failed to load bookings");
    }
  };

  const handleAddBooking = async () => {
    if (!bookingSession || !selectedMemberId) return;
    try {
      await api.createClassBooking(bookingSession.id, { member_id: selectedMemberId });
      setBookings(await api.getClassBookings(bookingSession.id));
      setSelectedMemberId("");
      toast.success("Member booked into class");
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingSession) return;
    try {
      await api.deleteClassBooking(bookingSession.id, bookingId);
      setBookings(await api.getClassBookings(bookingSession.id));
      toast.success("Booking removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove booking");
    }
  };

  return (
    <AppLayout title="Classes">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Class Scheduling</h1>
            <p className="mt-1 text-muted-foreground">Schedule group classes, assign trainers, and manage member bookings.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New Class</Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No class sessions yet.</TableCell></TableRow>
              ) : sessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(session)}>
                  <TableCell>
                    <p className="font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">{session.description || session.recurrence_label || "No description"}</p>
                  </TableCell>
                  <TableCell>
                    <p>{new Date(session.session_date).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{session.start_time || "--"} to {session.end_time || "--"}</p>
                  </TableCell>
                  <TableCell>{staffMap.get(session.trainer_staff_id || "")?.full_name || "Unassigned"}</TableCell>
                  <TableCell>{session.capacity || 0}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openBookings(session)}><Users className="h-3.5 w-3.5" /> Bookings</Button>
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
          <DialogHeader><DialogTitle>{editingSession ? "Edit Class" : "Create Class"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>{gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Class Name</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Session Date</Label>
              <Input type="date" min={today} value={form.session_date} onChange={(e) => setForm((current) => ({ ...current, session_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input type="number" min="0" value={form.capacity} onChange={(e) => setForm((current) => ({ ...current, capacity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((current) => ({ ...current, start_time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((current) => ({ ...current, end_time: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Trainer</Label>
              <Select value={form.trainer_staff_id || "__none__"} onValueChange={(value) => setForm((current) => ({ ...current, trainer_staff_id: value === "__none__" ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {staff.filter((item) => !form.gym_id || item.gym_id === form.gym_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name} ({item.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Recurrence Label</Label>
              <Input value={form.recurrence_label} onChange={(e) => setForm((current) => ({ ...current, recurrence_label: e.target.value }))} placeholder="Optional e.g. Every Monday" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave}>{editingSession ? "Update Class" : "Create Class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{bookingSession?.name || "Class"} Bookings</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {bookingSession ? new Date(bookingSession.session_date).toLocaleDateString() : ""}</div>
            </div>
            <div className="flex gap-3">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.filter((member) => !bookingSession || member.gym_id === bookingSession.gym_id).map((member) => <SelectItem key={member.id} value={member.id}>{member.name} - {member.phone}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleAddBooking}>Add</Button>
            </div>
            <div className="space-y-2">
              {bookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{memberMap.get(booking.member_id)?.name || booking.member_id}</p>
                    <p className="text-muted-foreground">{booking.status}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteBooking(booking.id)}>Remove</Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete class session?" description="This will remove the class session and its bookings." onConfirm={handleDelete} />
    </AppLayout>
  );
}
