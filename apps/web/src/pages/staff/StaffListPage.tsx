import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { StaffForm, createEmptyStaffForm, type StaffFormValue } from "@/components/staff/StaffForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export default function StaffListPage() {
  const { gyms } = useAuth();
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
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
      is_active: staff.is_active,
      permissions: new Set<string>(staff.section_permissions),
    });
  };

  const handleUpdate = async () => {
    if (!editingStaff || !form.full_name || !form.gym_id || !form.role.trim()) {
      toast.error("Name, role, and gym are required");
      return;
    }

    setSaving(true);
    try {
      await api.updateStaff(editingStaff.id, {
        gym_id: form.gym_id,
        full_name: form.full_name,
        phone: form.phone || null,
        role: form.role.trim(),
        specializations: form.specializations || null,
        is_active: form.is_active,
        section_permissions: Array.from(form.permissions),
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

  return (
    <AppLayout title="Staff List">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Staff List</h1>
            <p className="mt-1 text-muted-foreground">Filter, review, and update staff accounts across custom designations.</p>
          </div>
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
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No staff records found.</TableCell></TableRow>
              ) : filteredStaff.map((staff) => {
                const gym = gyms.find((item) => item.id === staff.gym_id);
                return (
                  <TableRow key={staff.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-medium">{staff.full_name}</p>
                      <p className="text-xs text-muted-foreground">{staff.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{staff.role}</Badge>
                    </TableCell>
                    <TableCell>{gym?.gym_name || "-"}</TableCell>
                    <TableCell>{staff.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(staff)}>
                          <Pencil className="h-3.5 w-3.5" />
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
              value={form}
              onChange={setForm}
              onSubmit={handleUpdate}
              onCancel={() => setEditingStaff(null)}
              saving={saving}
              editing
              submitLabel="Update Staff Member"
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
