import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isDateBefore, todayDateValue } from "@/lib/date";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ShiftForm = {
  gym_id: string;
  name: string;
  shift_type: "recurring" | "one_time";
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
};

const EMPTY_FORM: ShiftForm = {
  gym_id: "",
  name: "",
  shift_type: "recurring",
  description: "",
  event_date: "",
  start_time: "",
  end_time: "",
};

export default function ShiftsPage() {
  const today = todayDateValue();
  const { gyms, selectedGymId } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(EMPTY_FORM);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""),
    }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    fetchShifts();
  }, [selectedGymId]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      setShifts(await api.getShifts());
    } catch (error: any) {
      toast.error(error.message || "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm({ ...EMPTY_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      gym_id: shift.gym_id,
      name: shift.name,
      shift_type: shift.shift_type,
      description: shift.description || "",
      event_date: shift.event_date || "",
      start_time: shift.start_time || "",
      end_time: shift.end_time || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.gym_id) {
      toast.error("Name and gym are required");
      return;
    }

    if (form.shift_type === "one_time" && !form.event_date) {
      toast.error("Event date is required for one-time shifts");
      return;
    }
    if (form.shift_type === "one_time" && isDateBefore(form.event_date, today)) {
      toast.error("Event date cannot be in the past");
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving(true);
    const payload = {
      gym_id: form.gym_id,
      name: form.name,
      shift_type: form.shift_type,
      description: form.description || null,
      event_date: form.shift_type === "one_time" ? form.event_date || null : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    };

    try {
      if (editingShift) {
        await api.updateShift(editingShift.id, payload);
        toast.success("Shift updated");
      } else {
        await api.createShift(payload);
        toast.success("Shift created");
      }
      setDialogOpen(false);
      await fetchShifts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteShift(deleteId);
      toast.success("Shift deleted");
      await fetchShifts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete shift");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (shift: Shift) => {
    try {
      await api.updateShift(shift.id, { is_active: !shift.is_active });
      await fetchShifts();
    } catch (error: any) {
      toast.error(error.message || "Failed to update shift");
    }
  };

  return (
    <AppLayout title="Shifts">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Shifts</h1>
            <p className="mt-1 text-muted-foreground">Create recurring or one-time shifts for daily operations and special gym events.</p>
          </div>
          <Button onClick={openCreate} variant="gradient" className="gap-2"><Plus className="h-4 w-4" /> Add Shift</Button>
        </div>

        {shifts.length === 0 && !loading ? (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <Clock3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No shifts created yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create recurring shifts like Morning Shift or one-time sessions like Zumba Event.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shifts.map((shift) => {
              const gym = gyms.find((item) => item.id === shift.gym_id);
              return (
                <div key={shift.id} className={`rounded-xl border bg-card p-5 ${!shift.is_active ? "opacity-60" : ""}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{shift.name}</h3>
                        <Badge variant="outline">{shift.shift_type === "one_time" ? "One Time" : "Recurring"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{gym?.gym_name || "-"}</p>
                    </div>
                    <Badge variant={shift.is_active ? "default" : "secondary"}>{shift.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  {(shift.start_time || shift.end_time) && (
                    <p className="text-sm text-muted-foreground">{shift.start_time || "--:--"} to {shift.end_time || "--:--"}</p>
                  )}
                  {shift.event_date && <p className="mt-1 text-sm text-muted-foreground">Event Date: {new Date(shift.event_date).toLocaleDateString()}</p>}
                  {shift.description && <p className="mt-2 text-sm text-muted-foreground">{shift.description}</p>}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Switch checked={shift.is_active} onCheckedChange={() => toggleActive(shift)} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(shift)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(shift.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingShift ? "Edit Shift" : "Create Shift"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>
                  {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift Name</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Morning Shift, Zumba Event" />
            </div>
            <div className="space-y-1.5">
              <Label>Shift Type</Label>
              <Select value={form.shift_type} onValueChange={(value: ShiftForm["shift_type"]) => setForm((current) => ({ ...current, shift_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one_time">One Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.shift_type === "one_time" && (
              <div className="space-y-1.5">
                <Label>Event Date</Label>
                <DatePicker value={form.event_date} onChange={(value) => setForm((current) => ({ ...current, event_date: value }))} placeholder="Select event date" minDate={today} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm((current) => ({ ...current, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm((current) => ({ ...current, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Optional shift notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Shift?"
        description="This removes the shift definition for future use. Existing member shift labels stay unchanged."
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
