import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const SHIFTS = ['morning', 'afternoon', 'evening'];

export default function ShiftReportPage() {
  const { admin } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftFilter, setShiftFilter] = useState('all');

  useEffect(() => { if (admin) fetchData(); }, [admin]);

  const fetchData = async () => {
    if (!admin) return;
    setLoading(true);
    const { data } = await supabase
      .from('members').select('id, name, phone, shift, is_active, member_packages(status, end_date, package_name)')
      .eq('admin_id', admin.id).order('shift');
    setMembers((data as any) || []);
    setLoading(false);
  };

  const filtered = members.filter(m => shiftFilter === 'all' || m.shift === shiftFilter);

  const shiftCounts = SHIFTS.map(s => ({ shift: s, count: members.filter(m => m.shift === s).length }));

  return (
    <AppLayout title="Report by Shift">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">Report by Shift</h1>
            <p className="text-muted-foreground mt-0.5">Members organized by training shift</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {shiftCounts.map(s => (
            <div key={s.shift} className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground capitalize">{s.shift} Shift</p>
              <p className="text-2xl font-bold mt-1">{s.count}</p>
              <p className="text-xs text-muted-foreground">members</p>
            </div>
          ))}
        </div>

        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter shift" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Package Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No members found</TableCell></TableRow>
              ) : filtered.map(m => {
                const pkg = m.member_packages?.[0];
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell><p className="font-medium">{m.name}</p></TableCell>
                    <TableCell className="text-sm">{m.phone}</TableCell>
                    <TableCell>
                      {m.shift ? (
                        <Badge variant="outline" className="capitalize">{m.shift}</Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{pkg?.package_name || '—'}</TableCell>
                    <TableCell>
                      {pkg ? (
                        <Badge className={pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{pkg.status}</Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
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
