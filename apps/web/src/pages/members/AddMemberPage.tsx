import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { PackageType } from "@/types";
import { addDays, addMonths, format } from "date-fns";

export default function AddMemberPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", gender: "", date_of_birth: "",
    address: "", emergency_contact: "", shift: "", notes: "",
    reference_member_id: "",
    package_type_id: "", start_date: format(new Date(), "yyyy-MM-dd"),
    amount_paid: "", payment_mode: "cash",
  });

  useEffect(() => {
    if (!admin) return;
    api.getPlans(admin.id).then((data) => setPackages(data.filter((p) => p.is_active)));
    api.getActiveMembers(admin.id).then(setMembers);
  }, [admin]);

  const selectedPkg = packages.find((p) => p.id === form.package_type_id);
  const endDate = selectedPkg
    ? selectedPkg.duration_months
      ? format(addMonths(new Date(form.start_date), selectedPkg.duration_months), "yyyy-MM-dd")
      : selectedPkg.duration_days
        ? format(addDays(new Date(form.start_date), selectedPkg.duration_days), "yyyy-MM-dd")
        : ""
    : "";

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    setLoading(true);
    try {
      const member = await api.createMember({
        admin_id: admin.id,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone,
        gender: (form.gender as any) || undefined,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        emergency_contact: form.emergency_contact || undefined,
        shift: form.shift || undefined,
        notes: form.notes || undefined,
        reference_member_id: form.reference_member_id || undefined,
      });

      if (form.package_type_id && endDate) {
        await api.createMemberPackage({
          admin_id: admin.id,
          member_id: member.id,
          package_type_id: form.package_type_id,
          package_name: selectedPkg!.name,
          start_date: form.start_date,
          end_date: endDate,
          amount_paid: parseFloat(form.amount_paid) || selectedPkg!.price,
          payment_mode: form.payment_mode as any,
        });
        await api.createTransaction({
          admin_id: admin.id,
          member_id: member.id,
          type: "payment",
          amount: parseFloat(form.amount_paid) || selectedPkg!.price,
          payment_mode: form.payment_mode as any,
          description: `Package: ${selectedPkg!.name}`,
        });
      }

      toast.success("Member added successfully!");
      navigate("/members");
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Add Member">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Add New Member</h1>
          <p className="text-muted-foreground mt-1">Fill in the details to register a new member</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-base border-b pb-3">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Member name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9876543210" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="member@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={(v) => set("shift", v)}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Member address" />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact</Label>
                <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="Emergency phone" />
              </div>
              <div className="space-y-1.5">
                <Label>Reference Member</Label>
                <Select value={form.reference_member_id} onValueChange={(v) => set("reference_member_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-base border-b pb-3">Subscription Package</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Package Type</Label>
                <Select value={form.package_type_id} onValueChange={(v) => { set("package_type_id", v); const p = packages.find((pkg) => pkg.id === v); if (p) set("amount_paid", String(p.price)); }}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.length === 0
                      ? <SelectItem value="" disabled>No packages. Add from Members &gt; Package Types.</SelectItem>
                      : packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              {endDate && (
                <div className="space-y-1.5">
                  <Label>End Date (auto)</Label>
                  <Input value={endDate} disabled className="bg-muted" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Amount Paid (₹)</Label>
                <Input type="number" value={form.amount_paid} onChange={(e) => set("amount_paid", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={form.payment_mode} onValueChange={(v) => set("payment_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/members")}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
