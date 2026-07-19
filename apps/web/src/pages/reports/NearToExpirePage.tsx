import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { TriangleAlert as AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";
import { toast } from "sonner";

export default function NearToExpirePage() {
  const { admin, selectedGymId } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState("7");

  useEffect(() => { if (admin) fetchData(); }, [admin, daysFilter, selectedGymId]);

  const fetchData = async () => {
    if (!admin) return;
    setLoading(true);
    try { setMembers(await api.getNearToExpire(parseInt(daysFilter))); }
    catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  const daysLeft = (endDate: string) => Math.floor((new Date(endDate).getTime() - Date.now()) / 86400000);

  return (
    <AppLayout title="Near to Expire">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <div>
              <h1 className="text-2xl font-bold">Near to Expire</h1>
              <p className="text-muted-foreground mt-0.5">Members whose packages are expiring soon</p>
            </div>
          </div>
          <Select value={daysFilter} onValueChange={setDaysFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Next 3 days</SelectItem>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="15">Next 15 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-warning">
            <strong>{members.length}</strong> member{members.length !== 1 ? "s" : ""} expiring in the next {daysFilter} days.
          </p>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : members.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No expiring packages in this period</TableCell></TableRow>
              ) : members.map((m) => {
                const days = daysLeft(m.end_date);
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-medium">{m.members?.name}</p>
                      <p className="text-xs text-muted-foreground">{m.members?.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">{m.package_name}</TableCell>
                    <TableCell className="text-sm">{new Date(m.end_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={days <= 3 ? "badge-destructive" : days <= 7 ? "badge-warning" : "badge-primary"}>
                        {days === 0 ? "Today" : `${days}d`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => window.open(`tel:${m.members?.phone}`)}>
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
