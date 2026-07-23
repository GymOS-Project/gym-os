import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Phone, UserX, UserCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Member } from "@/types";

const NO_REFERENCE_MEMBER = "__none__";

interface MemberWithPackage extends Member {
  member_packages?: { status: string; end_date: string; package_name: string }[];
}

export default function MemberListPage() {
  const { admin, gyms, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberWithPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [referenceMembers, setReferenceMembers] = useState<{ id: string; name: string; gym_id: string }[]>([]);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    current_address: "",
    permanent_address: "",
    emergency_contact: "",
    aadhar_card_no: "",
    driving_license_no: "",
    pan_card_no: "",
    marital_status: "",
    gym_id: "",
    shift: "",
    notes: "",
    reference_member_id: NO_REFERENCE_MEMBER,
  });

  useEffect(() => {
    if (!admin) return;
    fetchMembers();
    api.getActiveMembers().then((data) => setReferenceMembers(data)).catch(() => {});
  }, [admin, selectedGymId]);

  const fetchMembers = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch { toast.error("Failed to load members"); }
    setLoading(false);
  };

  const getActivePackage = (m: MemberWithPackage) =>
    m.member_packages?.find((p) => p.status === "active") || m.member_packages?.[0];

  const getStatus = (m: MemberWithPackage) => {
    const pkg = getActivePackage(m);
    if (!pkg) return "no_package";
    if (pkg.status === "expired") return "expired";
    const daysLeft = Math.floor((new Date(pkg.end_date).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 7) return "expiring";
    return "active";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="badge-success">Active</Badge>;
      case "expiring": return <Badge className="badge-warning">Expiring Soon</Badge>;
      case "expired": return <Badge className="badge-destructive">Expired</Badge>;
      default: return <Badge variant="outline">No Package</Badge>;
    }
  };

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search) || (m.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || getStatus(m) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteMember(deleteId);
      toast.success("Member deleted");
      fetchMembers();
    } catch { toast.error("Failed to delete member"); }
    setDeleteId(null);
  };

  const toggleActive = async (m: Member) => {
    try {
      await api.updateMember(m.id, { is_active: !m.is_active });
      toast.success(`Member ${m.is_active ? "deactivated" : "activated"}`);
      fetchMembers();
    } catch { toast.error("Failed to update"); }
  };

  const setEdit = (key: keyof typeof editForm, value: string) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const openEditModal = async (memberId: string) => {
    setEditMemberId(memberId);
    setEditLoading(true);

    try {
      const member = await api.getMember(memberId);
      setEditForm({
        name: member.name,
        email: member.email || "",
        phone: member.phone,
        gender: member.gender || "",
        date_of_birth: member.date_of_birth || "",
        current_address: member.current_address || member.address || "",
        permanent_address: member.permanent_address || "",
        emergency_contact: member.emergency_contact || "",
        aadhar_card_no: member.aadhar_card_no || "",
        driving_license_no: member.driving_license_no || "",
        pan_card_no: member.pan_card_no || "",
        marital_status: member.marital_status || "",
        gym_id: member.gym_id || "",
        shift: member.shift || "",
        notes: member.notes || "",
        reference_member_id: member.reference_member_id || NO_REFERENCE_MEMBER,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load member");
      setEditMemberId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberId) return;
    if (!editForm.name || !editForm.phone) {
      toast.error("Name and phone are required");
      return;
    }

    setEditSaving(true);
    try {
      await api.updateMember(editMemberId, {
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone,
        gym_id: editForm.gym_id || null,
        gender: (editForm.gender as Member["gender"]) || null,
        date_of_birth: editForm.date_of_birth || null,
        address: editForm.current_address || null,
        current_address: editForm.current_address || null,
        permanent_address: editForm.permanent_address || null,
        emergency_contact: editForm.emergency_contact || null,
        aadhar_card_no: editForm.aadhar_card_no || null,
        driving_license_no: editForm.driving_license_no || null,
        pan_card_no: editForm.pan_card_no || null,
        marital_status: editForm.marital_status || null,
        shift: editForm.shift || null,
        notes: editForm.notes || null,
        reference_member_id:
          editForm.reference_member_id && editForm.reference_member_id !== NO_REFERENCE_MEMBER
            ? editForm.reference_member_id
            : null,
      });
      toast.success("Member updated successfully!");
      setEditMemberId(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <AppLayout title="Members">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">Member List</h1>
          <Button onClick={() => navigate("/members/add")} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="no_package">No Package</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No members found</TableCell></TableRow>
              ) : filtered.map((m) => {
                const pkg = getActivePackage(m);
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          {m.shift && <p className="text-xs text-muted-foreground capitalize">{m.shift} shift</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{m.phone}</p>
                      {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{pkg?.package_name || "—"}</TableCell>
                    <TableCell>{statusBadge(getStatus(m))}</TableCell>
                    <TableCell className="text-sm">{pkg?.end_date ? new Date(pkg.end_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.open(`tel:${m.phone}`)}>
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(m.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(m)}>
                          {m.is_active ? <UserX className="h-3.5 w-3.5 text-warning" /> : <UserCheck className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(m.id)}>
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
        <p className="text-sm text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""} shown</p>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the member and all their records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editMemberId} onOpenChange={(open) => !open && setEditMemberId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>

          {editLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading member...</div>
          ) : (
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input value={editForm.name} onChange={(e) => setEdit("name", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input value={editForm.phone} onChange={(e) => setEdit("phone", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEdit("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gym *</Label>
                  <Select value={editForm.gym_id} onValueChange={(value) => setEdit("gym_id", value)}>
                    <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                    <SelectContent>
                      {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={editForm.gender} onValueChange={(value) => setEdit("gender", value)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEdit("date_of_birth", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Shift</Label>
                  <Select value={editForm.shift} onValueChange={(value) => setEdit("shift", value)}>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select value={editForm.marital_status} onValueChange={(value) => setEdit("marital_status", value)}>
                    <SelectTrigger><SelectValue placeholder="Select marital status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Current Address</Label>
                  <Textarea value={editForm.current_address} onChange={(e) => setEdit("current_address", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Permanent Address</Label>
                  <Textarea value={editForm.permanent_address} onChange={(e) => setEdit("permanent_address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Emergency Contact</Label>
                  <Input value={editForm.emergency_contact} onChange={(e) => setEdit("emergency_contact", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference Member</Label>
                  <Select value={editForm.reference_member_id} onValueChange={(value) => setEdit("reference_member_id", value)}>
                    <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_REFERENCE_MEMBER}>None</SelectItem>
                      {referenceMembers
                        .filter((member) => !editForm.gym_id || member.gym_id === editForm.gym_id)
                        .filter((member) => member.id !== editMemberId)
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Aadhar Card No</Label>
                  <Input value={editForm.aadhar_card_no} onChange={(e) => setEdit("aadhar_card_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Driving License No</Label>
                  <Input value={editForm.driving_license_no} onChange={(e) => setEdit("driving_license_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN Card No</Label>
                  <Input value={editForm.pan_card_no} onChange={(e) => setEdit("pan_card_no", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={editForm.notes} onChange={(e) => setEdit("notes", e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditMemberId(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={editSaving}>
                  {editSaving ? "Updating..." : "Update Member"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
