import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Phone, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Member } from "@/types";

interface MemberWithPackage extends Member {
  member_packages?: { status: string; end_date: string; package_name: string }[];
}

export default function MemberListPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberWithPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    fetchMembers();
  }, [admin]);

  const fetchMembers = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await api.getMembers(admin.id);
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
    </AppLayout>
  );
}
