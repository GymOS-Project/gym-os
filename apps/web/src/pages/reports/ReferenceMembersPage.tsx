import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Share2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReferenceMembersPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { if (admin) fetchData(); }, [admin]);

  const fetchData = async () => {
    if (!admin) return;
    setLoading(true);
    const { data: members } = await supabase
      .from('members').select('id, name, phone, reference_member_id')
      .eq('admin_id', admin.id).not('reference_member_id', 'is', null);

    const refIds = [...new Set((members || []).map(m => m.reference_member_id))];
    const { data: refs } = refIds.length
      ? await supabase.from('members').select('id, name, phone').in('id', refIds as string[])
      : { data: [] };

    const refMap = Object.fromEntries((refs || []).map(r => [r.id, r]));
    const grouped: Record<string, any> = {};
    (members || []).forEach(m => {
      const refId = m.reference_member_id!;
      if (!grouped[refId]) grouped[refId] = { ref: refMap[refId], referrals: [] };
      grouped[refId].referrals.push(m);
    });

    setData(Object.values(grouped));
    setLoading(false);
  };

  const filtered = data.filter(d =>
    d.ref?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.referrals.some((r: any) => r.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout title="Reference Members">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Share2 className="h-6 w-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">Reference Members</h1>
            <p className="text-muted-foreground mt-0.5">Members who referred others to your gym</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Referrers</p>
            <p className="text-2xl font-bold mt-1">{data.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Referrals</p>
            <p className="text-2xl font-bold mt-1">{data.reduce((sum, d) => sum + d.referrals.length, 0)}</p>
          </div>
        </div>

        <Input placeholder="Search referrer or referral..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Referrer</TableHead>
                <TableHead>Referred Member</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No referrals found</TableCell></TableRow>
              ) : filtered.flatMap(d =>
                d.referrals.map((r: any, i: number) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell>{i === 0 ? (<div><p className="font-medium">{d.ref?.name}</p><p className="text-xs text-muted-foreground">{d.ref?.phone}</p></div>) : <span className="text-muted-foreground text-xs">↳ same</span>}</TableCell>
                    <TableCell><p className="font-medium">{r.name}</p></TableCell>
                    <TableCell className="text-sm">{r.phone}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
