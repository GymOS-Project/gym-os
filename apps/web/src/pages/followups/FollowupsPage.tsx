import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard as Edit, Check, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Followup, Member } from '@/types';

interface FollowupsPageProps {
  type: 'general' | 'payment_due' | 'renewal';
  title: string;
  description: string;
}

export default function FollowupsPage({ type, title, description }: FollowupsPageProps) {
  const { admin } = useAuth();
  const [followups, setFollowups] = useState<(Followup & { members: Member | null })[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFu, setEditFu] = useState<Followup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ member_id: '', followup_date: new Date().toISOString().split('T')[0], next_followup_date: '', notes: '', status: 'pending' });

  useEffect(() => { if (admin) { fetchFollowups(); fetchMembers(); } }, [admin]);

  const fetchFollowups = async () => {
    if (!admin) return;
    setLoading(true);
    const { data } = await supabase
      .from('followups').select('*, members(id, name, phone)')
      .eq('admin_id', admin.id).eq('type', type).order('followup_date', { ascending: false });
    setFollowups((data as any) || []);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!admin) return;
    const { data } = await supabase.from('members').select('id, name, phone').eq('admin_id', admin.id).eq('is_active', true);
    setMembers(data || []);
  };

  const openAdd = () => {
    setEditFu(null);
    setForm({ member_id: '', followup_date: new Date().toISOString().split('T')[0], next_followup_date: '', notes: '', status: 'pending' });
    setDialogOpen(true);
  };

  const openEdit = (fu: Followup) => {
    setEditFu(fu);
    setForm({ member_id: fu.member_id || '', followup_date: fu.followup_date, next_followup_date: fu.next_followup_date || '', notes: fu.notes || '', status: fu.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!admin) return;
    setSaving(true);
    const payload = { admin_id: admin.id, type, member_id: form.member_id || null, followup_date: form.followup_date, next_followup_date: form.next_followup_date || null, notes: form.notes || null, status: form.status };
    const { error } = editFu
      ? await supabase.from('followups').update(payload).eq('id', editFu.id)
      : await supabase.from('followups').insert(payload);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editFu ? 'Updated' : 'Follow-up added');
    setDialogOpen(false);
    fetchFollowups();
  };

  const markDone = async (id: string) => {
    await supabase.from('followups').update({ status: 'done' }).eq('id', id);
    toast.success('Marked as done');
    fetchFollowups();
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'done': return <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>;
      case 'no_response': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">No Response</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
    }
  };

  return (
    <AppLayout title={title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Follow-up
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Member</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : followups.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No follow-ups yet</TableCell></TableRow>
              ) : followups.map(fu => (
                <TableRow key={fu.id} className="hover:bg-muted/30">
                  <TableCell>
                    {fu.members ? (
                      <div>
                        <p className="font-medium">{fu.members.name}</p>
                        <p className="text-xs text-muted-foreground">{fu.members.phone}</p>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{new Date(fu.followup_date).toLocaleDateString()}</TableCell>
                  <TableCell>{fu.next_followup_date ? new Date(fu.next_followup_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{fu.notes || '—'}</TableCell>
                  <TableCell>{statusBadge(fu.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {fu.members && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => window.open(`tel:${fu.members!.phone}`)}>
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {fu.status === 'pending' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => markDone(fu.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(fu)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editFu ? 'Edit Follow-up' : 'Add Follow-up'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name} — {m.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.followup_date} onChange={e => setForm(p => ({ ...p, followup_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up</Label>
                <Input type="date" value={form.next_followup_date} onChange={e => setForm(p => ({ ...p, next_followup_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes about this follow-up" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving...' : editFu ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
