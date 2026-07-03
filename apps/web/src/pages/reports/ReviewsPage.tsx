import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Review, Member } from '@/types';

export default function ReviewsPage() {
  const { admin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ member_id: '', rating: '5', comment: '', review_date: new Date().toISOString().split('T')[0] });

  useEffect(() => { if (admin) { fetchReviews(); fetchMembers(); } }, [admin]);

  const fetchReviews = async () => {
    if (!admin) return;
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*, members(name, phone)').eq('admin_id', admin.id).order('review_date', { ascending: false });
    setReviews((data as any) || []);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!admin) return;
    const { data } = await supabase.from('members').select('id, name').eq('admin_id', admin.id);
    setMembers(data || []);
  };

  const handleSave = async () => {
    if (!admin) return;
    setSaving(true);
    const { error } = await supabase.from('reviews').insert({
      admin_id: admin.id,
      member_id: form.member_id || null,
      rating: parseInt(form.rating),
      comment: form.comment || null,
      review_date: form.review_date,
    });
    setSaving(false);
    if (error) { toast.error('Failed to save review'); return; }
    toast.success('Review added');
    setDialogOpen(false);
    fetchReviews();
  };

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
      ))}
    </div>
  );

  return (
    <AppLayout title="Member Reviews">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Member Reviews</h1>
            <p className="text-muted-foreground mt-1">Feedback and ratings from your members</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Review
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              <StarRating rating={Math.round(avgRating)} />
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold mt-1">{reviews.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">5-Star Reviews</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{reviews.filter(r => r.rating === 5).length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No reviews yet</p>
            <p className="text-muted-foreground text-sm mt-1">Add your first member review</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map(r => (
              <div key={r.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{(r.members as any)?.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.review_date).toLocaleDateString()}</p>
                  </div>
                  <StarRating rating={r.rating || 0} />
                </div>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Member Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Anonymous</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select value={form.rating} onValueChange={v => setForm(p => ({ ...p, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{'★'.repeat(r)} ({r}/5)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Review Date</Label>
              <Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Comment</Label>
              <Input value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} placeholder="Member's feedback" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving...' : 'Add Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
