import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AddEnquiryPage() {
  const { admin, gyms, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    gym_id: selectedGymId !== "all" ? selectedGymId : "",
    name: "", phone: "", email: "", source: "", interest: "",
    assigned_to: "", next_followup_date: "", notes: "",
  });

  const availableGyms = gyms.length > 0 ? gyms : [];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: selectedGymId !== "all" ? selectedGymId : current.gym_id || gyms[0]?.id || "",
    }));
  }, [gyms, selectedGymId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    if (!form.gym_id) { toast.error("Gym is required"); return; }
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    setLoading(true);
    try {
      await api.createEnquiry({
        gym_id: form.gym_id,
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        source: form.source || undefined,
        interest: form.interest || undefined,
        assigned_to: form.assigned_to || undefined,
        next_followup_date: form.next_followup_date || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Enquiry added!");
      navigate("/enquiry");
    } catch { toast.error("Failed to add enquiry"); }
    setLoading(false);
  };

  return (
    <AppLayout title="Add Enquiry">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Add New Enquiry</h1>
          <p className="text-muted-foreground mt-1">Register a new lead or prospective member</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableGyms.length > 1 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Gym *</Label>
                <Select value={form.gym_id} onValueChange={(v) => set("gym_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                  <SelectContent>
                    {availableGyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enquiry name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9876543210" required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="flyer">Flyer / Poster</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interest</Label>
              <Input value={form.interest} onChange={(e) => set("interest", e.target.value)} placeholder="e.g. Weight loss, Bodybuilding" />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} placeholder="Staff member name" />
            </div>
            <div className="space-y-1.5">
              <Label>Next Follow-up Date</Label>
              <Input type="date" value={form.next_followup_date} onChange={(e) => set("next_followup_date", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/enquiry")}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Adding..." : "Add Enquiry"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
