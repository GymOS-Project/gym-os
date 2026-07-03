import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, CreditCard as Edit, Trash2, Phone, UserCheck, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Enquiry } from '@/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnquiryListPageProps {
  filterStatus?: string;
  title: string;
  description: string;
}

export default function EnquiryListPage({ filterStatus, title, description }: EnquiryListPageProps) {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editEnquiry, setEditEnquiry] = useState<Enquiry | null>(null);
  const [followupDialog, setFollowupDialog] = useState<Enquiry | null>(null);
  const [fuForm, setFuForm] = useState({ next_followup_date: '', notes: '', status: 'done' as const });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (admin) fetchEnquiries(); }, [admin, filterStatus]);

  const fetchEnquiries = async () => {
    if (!admin) return;
    setLoading(true);
    let q = supabase.from('enquiries').select('*').eq('admin_id', admin.id);
    if (filterStatus) q = q.eq('status', filterStatus);
    const { data } = await q.order('created_at', { ascending: false });
    setEnquiries(data || []);
    setLoading(false);
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      contacted: 'bg-purple-100 text-purple-700 border-purple-200',
      follow_up: 'bg-amber-100 text-amber-700 border-amber-200',
      converted: 'bg-green-100 text-green-700 border-green-200',
      not_interested: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels: Record<string, string> = { new: 'New', contacted: 'Contacted', follow_up: 'Follow Up', converted: 'Converted', not_interested: 'Not Interested' };
    return <Badge className={cfg[s] || ''}>{labels[s] || s}</Badge>;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('enquiries').delete().eq('id', deleteId);
    toast.success('Enquiry deleted');
    setDeleteId(null);
    fetchEnquiries();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('enquiries').update({ status }).eq('id', id);
    toast.success('Status updated');
    fetchEnquiries();
  };

  const handleFollowup = async () => {
    if (!followupDialog || !admin) return;
    setSaving(true);
    await supabase.from('enquiry_followups').insert({
      admin_id: admin.id,
      enquiry_id: followupDialog.id,
      followup_date: new Date().toISOString().split('T')[0],
      next_followup_date: fuForm.next_followup_date || null,
      notes: fuForm.notes || null,
      status: fuForm.status,
    });
    if (fuForm.next_followup_date) {
      await supabase.from('enquiries').update({ status: 'follow_up', next_followup_date: fuForm.next_followup_date }).eq('id', followupDialog.id);
    }
    setSaving(false);
    toast.success('Follow-up recorded');
    setFollowupDialog(null);
    fetchEnquiries();
  };

  const filtered = enquiries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  );

  return (
    <AppLayout title={title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          {!filterStatus && (
            <Button onClick={() => navigate('/enquiry/add')} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Add Enquiry
            </Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No enquiries found</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold text-sm shrink-0">
                        {e.name[0].toUpperCase()}
                      </div>
                      <p className="font-medium">{e.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.phone}</TableCell>
                  <TableCell className="text-sm capitalize">{e.source?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell className="text-sm">{e.interest || '—'}</TableCell>
                  <TableCell className="text-sm">{e.next_followup_date ? new Date(e.next_followup_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => window.open(`tel:${e.phone}`)}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500" title="Add Follow-up" onClick={() => { setFollowupDialog(e); setFuForm({ next_followup_date: '', notes: '', status: 'done' }); }}>
                        <PhoneCall className="h-3.5 w-3.5" />
                      </Button>
                      {e.status !== 'converted' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" title="Mark Converted" onClick={() => updateStatus(e.id, 'converted')}>
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Follow-up dialog */}
      <Dialog open={!!followupDialog} onOpenChange={() => setFollowupDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Follow-up for {followupDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Next Follow-up Date</Label>
              <Input type="date" value={fuForm.next_followup_date} onChange={e => setFuForm(p => ({ ...p, next_followup_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={fuForm.notes} onChange={e => setFuForm(p => ({ ...p, notes: e.target.value }))} placeholder="What was discussed?" />
            </div>
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={fuForm.status} onValueChange={v => setFuForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Contacted</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialog(null)}>Cancel</Button>
            <Button onClick={handleFollowup} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving...' : 'Save Follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this enquiry and all its follow-ups.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
