import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("");

  useEffect(() => {
    api.getActivityLogs({ entity_type: entityType !== "all" ? entityType : undefined, action: action || undefined })
      .then(setLogs)
      .catch((error) => toast.error(error.message || "Failed to load activity logs"));
  }, [entityType, action]);

  return (
    <AppLayout title="Activity Logs">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="mt-1 text-muted-foreground">Review who changed what across operations, attendance, finance, and integrations.</p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label>Entity Type</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="shift">Shift</SelectItem>
                <SelectItem value="class_session">Class Session</SelectItem>
                <SelectItem value="pt_session">PT Session</SelectItem>
                <SelectItem value="attendance_log">Attendance</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payroll_run">Payroll Run</SelectItem>
                <SelectItem value="essl_device">eSSL Device</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="create, update, refund..." className="w-[220px]" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No activity logs found.</TableCell></TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.actor_role || "system"}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{log.entity_id || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
