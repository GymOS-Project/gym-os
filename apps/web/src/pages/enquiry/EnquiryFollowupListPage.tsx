import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EnquiryFollowup } from "@/types";
import { toast } from "sonner";

export default function EnquiryFollowupListPage() {
  const { admin } = useAuth();
  const [followups, setFollowups] = useState<(EnquiryFollowup & { enquiries?: { name: string; phone: string; status: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { if (admin) fetchData(); }, [admin]);

  const fetchData = async () => {
    if (!admin) return;
    setLoading(true);
    try { setFollowups(await api.getEnquiryFollowups()); }
    catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  const filtered = followups.filter((f) =>
    f.enquiries?.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.enquiries?.phone?.includes(search)
  );

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = { done: "badge-success", no_response: "badge-secondary", pending: "badge-warning" };
    return <Badge className={cfg[s] || ""}>{s.replace("_", " ")}</Badge>;
  };

  return (
    <AppLayout title="Enquiry Follow Up List">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Enquiry Follow Up List</h1>
            <p className="text-muted-foreground mt-0.5">All follow-up records for enquiries</p>
          </div>
        </div>
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Enquiry</TableHead>
                <TableHead>Follow-up Date</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No follow-ups found</TableCell></TableRow>
              ) : filtered.map((f) => (
                <TableRow key={f.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="font-medium">{f.enquiries?.name}</p>
                    <p className="text-xs text-muted-foreground">{f.enquiries?.phone}</p>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(f.followup_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{f.next_followup_date ? new Date(f.next_followup_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{f.notes || "—"}</TableCell>
                  <TableCell>{statusBadge(f.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
