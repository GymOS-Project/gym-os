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
import { isDateAfter, isDateTimeAfter, isDateTimeBefore, isSameCalendarDate, nowDateTimeLocalValue, todayDateValue } from "@/lib/date";
import { EMPTY_ATTENDANCE_FORM } from "@/utils/constants";
import { Clock3, LogIn, LogOut, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const today = todayDateValue();
  const now = nowDateTimeLocalValue();
  const { gyms, selectedGymId } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string; gym_id: string }[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [form, setForm] = useState({ ...EMPTY_ATTENDANCE_FORM });
  const [filterEntityType, setFilterEntityType] = useState("all");
  const [filterDate, setFilterDate] = useState(todayDateValue());
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [logData, memberData, staffData] = await Promise.all([
        api.getAttendanceLogs({ attendance_date: filterDate || undefined, entity_type: filterEntityType !== "all" ? filterEntityType : undefined }),
        api.getActiveMembers(),
        api.getStaff(),
      ]);
      setLogs(logData);
      setMembers(memberData);
      setStaff(staffData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load attendance");
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
  }, [selectedGymId, filterEntityType, filterDate]);

  const memberMap = useMemo(() => new Map(members.map((item) => [item.id, item])), [members]);
  const staffMap = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff]);

  const handleCheckIn = async () => {
    if (!form.gym_id) {
      toast.error("Gym is required");
      return;
    }
    if (form.entity_type === "member" && !form.member_id) {
      toast.error("Select a member");
      return;
    }
    if (form.entity_type === "staff" && !form.staff_account_id) {
      toast.error("Select a staff member");
      return;
    }
    if (isDateAfter(form.attendance_date, today)) {
      toast.error("Attendance date cannot be in the future");
      return;
    }
    if (form.check_in_at && isDateTimeAfter(form.check_in_at, now)) {
      toast.error("Check-in time cannot be in the future");
      return;
    }
    if (form.check_in_at && !isSameCalendarDate(form.attendance_date, form.check_in_at)) {
      toast.error("Check-in time must match the attendance date");
      return;
    }

    try {
      await api.checkInAttendance({
        gym_id: form.gym_id,
        entity_type: form.entity_type,
        member_id: form.entity_type === "member" ? form.member_id : null,
        staff_account_id: form.entity_type === "staff" ? form.staff_account_id : null,
        attendance_date: form.attendance_date,
        check_in_at: form.check_in_at ? new Date(form.check_in_at).toISOString() : undefined,
        status: form.status,
        notes: form.notes || null,
      });
      toast.success("Check-in recorded");
      setForm({ ...EMPTY_ATTENDANCE_FORM, gym_id: form.gym_id, attendance_date: form.attendance_date });
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record check-in");
    }
  };

  const openEdit = (log: AttendanceLog) => {
    setEditingLog(log);
    setForm({
      gym_id: log.gym_id,
      entity_type: log.entity_type,
      member_id: log.member_id || "",
      staff_account_id: log.staff_account_id || "",
      attendance_date: log.attendance_date,
      check_in_at: log.check_in_at ? log.check_in_at.slice(0, 16) : "",
      check_out_at: log.check_out_at ? log.check_out_at.slice(0, 16) : "",
      status: log.status,
      notes: log.notes || "",
    });
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLog) return;
    if (isDateAfter(form.attendance_date, today)) {
      toast.error("Attendance date cannot be in the future");
      return;
    }
    if (form.check_in_at && isDateTimeAfter(form.check_in_at, now)) {
      toast.error("Check-in time cannot be in the future");
      return;
    }
    if (form.check_out_at && isDateTimeAfter(form.check_out_at, now)) {
      toast.error("Check-out time cannot be in the future");
      return;
    }
    if (form.check_in_at && !isSameCalendarDate(form.attendance_date, form.check_in_at)) {
      toast.error("Check-in time must match the attendance date");
      return;
    }
    if (form.check_out_at && !isSameCalendarDate(form.attendance_date, form.check_out_at)) {
      toast.error("Check-out time must match the attendance date");
      return;
    }
    if (form.check_in_at && form.check_out_at && isDateTimeBefore(form.check_out_at, form.check_in_at)) {
      toast.error("Check-out time must be after check-in time");
      return;
    }
    try {
      await api.updateAttendanceLog(editingLog.id, {
        attendance_date: form.attendance_date,
        check_in_at: form.check_in_at ? new Date(form.check_in_at).toISOString() : null,
        check_out_at: form.check_out_at ? new Date(form.check_out_at).toISOString() : null,
        status: form.status,
        notes: form.notes || null,
      });
      toast.success("Attendance updated");
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update attendance");
    }
  };

  const handleCheckOut = async (log: AttendanceLog) => {
    try {
      await api.checkOutAttendance(log.id, {});
      toast.success("Check-out recorded");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record check-out");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteAttendanceLog(deleteId);
      toast.success("Attendance entry deleted");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete attendance entry");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Attendance">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Attendance and Check-In</h1>
          <p className="mt-1 text-muted-foreground">Record manual attendance now and use the same structure later for eSSL device punches.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold">Quick Check-In</h2>
            <div className="space-y-1.5">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>{gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Select value={form.entity_type} onValueChange={(value) => setForm((current) => ({ ...current, entity_type: value, member_id: "", staff_account_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.entity_type === "member" ? (
              <div className="space-y-1.5">
                <Label>Member</Label>
                <Select value={form.member_id} onValueChange={(value) => setForm((current) => ({ ...current, member_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>{members.filter((item) => !form.gym_id || item.gym_id === form.gym_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.phone}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Staff</Label>
                <Select value={form.staff_account_id} onValueChange={(value) => setForm((current) => ({ ...current, staff_account_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{staff.filter((item) => !form.gym_id || item.gym_id === form.gym_id).map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name} ({item.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Attendance Date</Label>
              <Input type="date" max={today} value={form.attendance_date} onChange={(e) => setForm((current) => ({ ...current, attendance_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-In Time</Label>
              <Input type="datetime-local" max={now} value={form.check_in_at} onChange={(e) => setForm((current) => ({ ...current, check_in_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
            </div>
            <Button variant="gradient" className="w-full gap-2" onClick={handleCheckIn}><LogIn className="h-4 w-4" /> Record Check-In</Button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label>Filter Type</Label>
                <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="member">Members</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filter Date</Label>
                <Input type="date" max={today} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-[180px]" />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Person</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No attendance records found.</TableCell></TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(log)}>
                      <TableCell>
                        <p className="font-medium">{log.entity_type === "member" ? memberMap.get(log.member_id || "")?.name : staffMap.get(log.staff_account_id || "")?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{log.entity_type}</p>
                      </TableCell>
                      <TableCell>{new Date(log.attendance_date).toLocaleDateString()}</TableCell>
                      <TableCell>{log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString() : "-"}</TableCell>
                      <TableCell>{log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString() : "-"}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {!log.check_out_at && <Button size="sm" variant="outline" className="gap-1" onClick={() => handleCheckOut(log)}><LogOut className="h-3.5 w-3.5" /> Out</Button>}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(log)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Update Attendance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Attendance Date</Label><Input type="date" max={today} value={form.attendance_date} onChange={(e) => setForm((current) => ({ ...current, attendance_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Check-In</Label><Input type="datetime-local" max={now} value={form.check_in_at} onChange={(e) => setForm((current) => ({ ...current, check_in_at: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Check-Out</Label><Input type="datetime-local" min={form.check_in_at || undefined} max={now} value={form.check_out_at} onChange={(e) => setForm((current) => ({ ...current, check_out_at: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Status</Label><Input value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleUpdate}><Clock3 className="mr-2 h-4 w-4" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete attendance record?" description="This removes the attendance entry and its linked timing data." onConfirm={handleDelete} />
    </AppLayout>
  );
}
