import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { StaffForm, createEmptyStaffForm } from "@/components/staff/StaffForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";


export default function StaffListPage() {
  const { gyms } = useAuth();
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<StaffFormValue>(createEmptyStaffForm());

  const fetchStaff = async () => {
    setLoading(true);
    try {
      setStaffList(await api.getStaff(roleFilter !== "all" ? roleFilter : undefined));
    } catch (error: any) {
      toast.error(error.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(staffList.map((item) => item.role).filter(Boolean)));
    return roles.sort((a, b) => a.localeCompare(b));
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return staffList.filter((item) =>
      item.full_name.toLowerCase().includes(lowerQuery)
      || item.email.toLowerCase().includes(lowerQuery)
      || item.role.toLowerCase().includes(lowerQuery)
      || (item.phone || "").includes(query),
    );
  }, [query, staffList]);

  const openEdit = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setForm({
      gym_id: staff.gym_id,
      full_name: staff.full_name,
      email: staff.email,
      password: "",
      phone: staff.phone || "",
      role: staff.role || "staff",
      specializations: staff.specializations || "",
      external_user_code: staff.external_user_code || "",
      compensation_type: (staff.compensation_type as CompensationType) || "fixed",
      base_salary: staff.base_salary ? String(staff.base_salary) : "",
      per_session_rate: staff.per_session_rate ? String(staff.per_session_rate) : "",
      commission_percent: staff.commission_percent ? String(staff.commission_percent) : "",
      is_active: staff.is_active,
      permissions: (staff.section_permissions as StaffPermission[]),
    });
  };

  const handleUpdate = async (values: StaffFormValue) => {
    if (!editingStaff) return;
    setSaving(true);
    try {
      await api.updateStaff(editingStaff.id, {
        gym_id: values.gym_id,
        full_name: values.full_name,
        phone: values.phone || null,
        role: values.role.trim(),
        specializations: values.specializations || null,
        external_user_code: values.external_user_code || null,
        compensation_type: values.compensation_type,
        base_salary: Number(values.base_salary || 0),
        per_session_rate: Number(values.per_session_rate || 0),
        commission_percent: Number(values.commission_percent || 0),
        is_active: values.is_active,
        section_permissions: values.permissions,
      });
      toast.success("Staff member updated");
      setEditingStaff(null);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteStaff(deleteId);
      toast.success("Staff member deleted");
      setDeleteId(null);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete staff member");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout title="Staff List">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Staff List</h1>
            <p className="mt-1 text-muted-foreground">Filter, review, and update staff accounts across custom designations.</p>
          </div>
          <Button asChild variant="gradient" className="gap-2">
            <a href="/staff/create"><Plus className="h-4 w-4" /> Create Staff</a>
          </Button>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, role, phone" className="pl-9" />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gym</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></TableCell></TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No staff records found.</TableCell></TableRow>
              ) : filteredStaff.map((staff) => {
                const gym = gyms.find((item) => item.id === staff.gym_id);
                return (
                  <TableRow key={staff.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(staff)}>
                    <TableCell>
                      <p className="font-medium">{staff.full_name}</p>
                      <p className="text-xs text-muted-foreground">{staff.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{staff.role}</Badge>
                    </TableCell>
                    <TableCell>{gym?.gym_name || "-"}</TableCell>
                    <TableCell>{staff.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(staff)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(staff.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={Boolean(editingStaff)} onOpenChange={(open) => !open && setEditingStaff(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
            </DialogHeader>
            <StaffForm
              gyms={gyms}
              value={form as any}
              onSubmit={handleUpdate}
              onCancel={() => setEditingStaff(null)}
              saving={saving}
              editing
              submitLabel="Update Staff Member"
            />
          </DialogContent>
        </Dialog>
        <DeleteConfirmationDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete staff member?"
          description="This removes the staff profile and disables their linked auth account. This action cannot be undone."
          onConfirm={handleDelete}
          confirmDisabled={deleting}
        />
      </div>
    </AppLayout>
  );
}
