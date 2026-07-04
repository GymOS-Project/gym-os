import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const { admin } = useAuth();
  const [txns, setTxns] = useState<(Transaction & { members?: { name: string; phone: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => { if (admin) fetchTxns(); }, [admin]);

  const fetchTxns = async () => {
    if (!admin) return;
    setLoading(true);
    try { setTxns(await api.getTransactions(admin.id)); }
    catch { toast.error("Failed to load transactions"); }
    setLoading(false);
  };

  const filtered = txns.filter((t) => {
    const matchSearch = t.members?.name?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const total = filtered.filter((t) => t.type === "payment").reduce((sum, t) => sum + Number(t.amount), 0);
  const refunds = filtered.filter((t) => t.type === "refund").reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <AppLayout title="Transactions">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground mt-0.5">All financial transactions</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">₹{total.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Refunds</p>
            <p className="text-2xl font-bold text-red-500 mt-1">₹{refunds.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Net Revenue</p>
            <p className="text-2xl font-bold mt-1">₹{(total - refunds).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No transactions</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell><p className="font-medium text-sm">{t.members?.name || "—"}</p></TableCell>
                  <TableCell>
                    <Badge className={t.type === "payment" ? "bg-green-100 text-green-700" : t.type === "refund" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}>{t.type}</Badge>
                  </TableCell>
                  <TableCell className={`font-medium ${t.type === "refund" ? "text-red-500" : "text-teal-600"}`}>
                    {t.type === "refund" ? "-" : ""}₹{Number(t.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{t.payment_mode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
