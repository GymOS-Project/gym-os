import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isDateAfter, todayDateValue } from "@/lib/date";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const EMPTY_RUN = {
  gym_id: "",
  title: "",
  period_start: todayDateValue(),
  period_end: todayDateValue(),
  notes: "",
};

export default function PayrollPage() {
  const { gyms, selectedGymId } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runForm, setRunForm] = useState({ ...EMPTY_RUN });
  const [entryForm, setEntryForm] = useState<PayrollEntry | null>(null);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const [runData, staffData] = await Promise.all([api.getPayrollRuns(), api.getStaff()]);
      setRuns(runData);
      setStaff(staffData);
      if (selectedRun) {
        const nextRun = runData.find((item) => item.id === selectedRun.id) || null;
        setSelectedRun(nextRun);
        if (nextRun) {
          setEntries(await api.getPayrollEntries(nextRun.id));
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load payroll runs");
    }
  };

  useEffect(() => {
    setRunForm((current) => ({
      ...current,
      gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""),
    }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    fetchRuns();
  }, [selectedGymId]);

  const staffMap = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff]);

  const openRunDialog = () => {
    setRunForm({ ...EMPTY_RUN, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setRunDialogOpen(true);
  };

  const handleCreateRun = async () => {
    if (!runForm.gym_id || !runForm.title || !runForm.period_start || !runForm.period_end) {
      toast.error("Gym, title, start date, and end date are required");
      return;
    }
    if (isDateAfter(runForm.period_start, runForm.period_end)) {
      toast.error("End date must be on or after the start date");
      return;
    }

    try {
      const result = await api.createPayrollRun({
        gym_id: runForm.gym_id,
        title: runForm.title,
        period_start: runForm.period_start,
        period_end: runForm.period_end,
        notes: runForm.notes || null,
      });
      setRunDialogOpen(false);
      setSelectedRun(result.run);
      setEntries(result.entries);
      await fetchRuns();
      toast.success("Payroll run created");
    } catch (error: any) {
      toast.error(error.message || "Failed to create payroll run");
    }
  };

  const handleSelectRun = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      setEntries(await api.getPayrollEntries(run.id));
    } catch (error: any) {
      toast.error(error.message || "Failed to load payroll entries");
    }
  };

  const openEntryDialog = (entry: PayrollEntry) => {
    setEntryForm(entry);
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm) return;
    try {
      await api.updatePayrollEntry(entryForm.id, entryForm);
      if (selectedRun) {
        setEntries(await api.getPayrollEntries(selectedRun.id));
      }
      setEntryDialogOpen(false);
      toast.success("Payroll entry updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update payroll entry");
    }
  };

  const handleDeleteRun = async () => {
    if (!deleteId) return;
    try {
      await api.deletePayrollRun(deleteId);
      toast.success("Payroll run deleted");
      setSelectedRun(null);
      setEntries([]);
      await fetchRuns();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payroll run");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Payroll">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Payroll and Compensation</h1>
            <p className="mt-1 text-muted-foreground">Generate payroll runs from staff compensation settings and adjust payouts before finalization.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openRunDialog}><Plus className="h-4 w-4" /> New Payroll Run</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">No payroll runs yet.</div>
            ) : runs.map((run) => (
              <button key={run.id} type="button" className={`w-full rounded-xl border p-4 text-left ${selectedRun?.id === run.id ? "border-primary bg-primary/5" : "bg-card"}`} onClick={() => handleSelectRun(run)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{run.title}</p>
                    <p className="text-sm text-muted-foreground">{run.period_start} to {run.period_end}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(event) => { event.stopPropagation(); setDeleteId(run.id); }}>Delete</Button>
                </div>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Staff</TableHead>
                  <TableHead>Comp Type</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedRun ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Select a payroll run to view its entries.</TableCell></TableRow>
                ) : entries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No payroll entries generated.</TableCell></TableRow>
                ) : entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell>{staffMap.get(entry.staff_id)?.full_name || entry.staff_id}</TableCell>
                    <TableCell>{entry.compensation_type}</TableCell>
                    <TableCell>₹{Number(entry.base_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(entry.net_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => openEntryDialog(entry)}>Adjust</Button></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={runForm.title} onChange={(e) => setRunForm((current) => ({ ...current, title: e.target.value }))} placeholder="July 2026 payroll" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" max={runForm.period_end || undefined} value={runForm.period_start} onChange={(e) => setRunForm((current) => ({ ...current, period_start: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" min={runForm.period_start || undefined} value={runForm.period_end} onChange={(e) => setRunForm((current) => ({ ...current, period_end: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={runForm.notes} onChange={(e) => setRunForm((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleCreateRun}>Generate Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Adjust Payroll Entry</DialogTitle></DialogHeader>
          {entryForm && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Base</Label><Input type="number" value={entryForm.base_amount} onChange={(e) => setEntryForm({ ...entryForm, base_amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Session Count</Label><Input type="number" value={entryForm.session_count} onChange={(e) => setEntryForm({ ...entryForm, session_count: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Session Rate</Label><Input type="number" value={entryForm.session_rate} onChange={(e) => setEntryForm({ ...entryForm, session_rate: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Commission Amount</Label><Input type="number" value={entryForm.commission_amount} onChange={(e) => setEntryForm({ ...entryForm, commission_amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Bonus</Label><Input type="number" value={entryForm.bonus_amount} onChange={(e) => setEntryForm({ ...entryForm, bonus_amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Deductions</Label><Input type="number" value={entryForm.deductions} onChange={(e) => setEntryForm({ ...entryForm, deductions: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea value={entryForm.notes || ""} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSaveEntry}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete payroll run?" description="This will remove the payroll run and all generated entries." onConfirm={handleDeleteRun} />
    </AppLayout>
  );
}
