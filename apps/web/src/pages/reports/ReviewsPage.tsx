import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Review } from "@/types";

const ANONYMOUS_MEMBER = "__anonymous__";

export default function ReviewsPage() {
  const { admin } = useAuth();
  const [reviews, setReviews] = useState<(Review & { members?: { name: string; phone: string } })[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ member_id: ANONYMOUS_MEMBER, rating: "5", comment: "", review_date: new Date().toISOString().split("T")[0] });

  useEffect(() => { if (admin) { fetchReviews(); fetchMembers(); } }, [admin]);

  const fetchReviews = async () => {
    if (!admin) return;
    setLoading(true);
    try { setReviews(await api.getReviews()); }
    catch { toast.error("Failed to load reviews"); }
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!admin) return;
    try { setMembers(await api.getActiveMembers()); }
    catch {}
  };

  const handleSave = async () => {
    if (!admin) return;
    setSaving(true);
    try {
        await api.createReview({
          member_id: form.member_id !== ANONYMOUS_MEMBER ? form.member_id : undefined,
          rating: parseInt(form.rating),
          comment: form.comment || undefined,
          review_date: form.review_date,
      });
      toast.success("Review added");
      setDialogOpen(false);
      fetchReviews();
    } catch { toast.error("Failed to save review"); }
    setSaving(false);
  };

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
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
          <Button onClick={() => setDialogOpen(true)} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" /> Add Review
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center gap-2 mt-1"><p className="text-2xl font-bold">{avgRating.toFixed(1)}</p><StarRating rating={Math.round(avgRating)} /></div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold mt-1">{reviews.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">5-Star Reviews</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{reviews.filter((r) => r.rating === 5).length}</p>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No reviews yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{r.members?.name || "Anonymous"}</p>
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
                <Select value={form.member_id} onValueChange={(v) => setForm((p) => ({ ...p, member_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANONYMOUS_MEMBER}>Anonymous</SelectItem>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select value={form.rating} onValueChange={(v) => setForm((p) => ({ ...p, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{"★".repeat(r)} ({r}/5)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Review Date</Label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm((p) => ({ ...p, review_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Comment</Label>
              <Input value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))} placeholder="Member's feedback" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="gradient" disabled={saving}>{saving ? "Saving..." : "Add Review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
