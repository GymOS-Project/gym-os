import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { BadgePercent, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CouponForm = {
  gym_id: string;
  applies_to_all_gyms: boolean;
  code: string;
  name: string;
  description: string;
  discount_type: "percentage" | "flat";
  discount_value: string;
  max_discount_amount: string;
  min_purchase_amount: string;
  usage_limit: string;
  usage_limit_per_member: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY_FORM: CouponForm = {
  gym_id: "",
  applies_to_all_gyms: false,
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  max_discount_amount: "",
  min_purchase_amount: "",
  usage_limit: "",
  usage_limit_per_member: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

export default function CouponsPage() {
  const { gyms, selectedGymId } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      setCoupons(await api.getCoupons(true));
    } catch (error: any) {
      toast.error(error.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm((current) => ({ ...current, gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "") }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    fetchCoupons();
  }, [selectedGymId]);

  const filteredCoupons = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return coupons.filter((coupon) => !search || coupon.code.toLowerCase().includes(lowerSearch) || coupon.name.toLowerCase().includes(lowerSearch));
  }, [coupons, search]);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm({ ...EMPTY_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      gym_id: coupon.gym_id || gyms[0]?.id || "",
      applies_to_all_gyms: !coupon.gym_id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_discount_amount: coupon.max_discount_amount == null ? "" : String(coupon.max_discount_amount),
      min_purchase_amount: coupon.min_purchase_amount == null ? "" : String(coupon.min_purchase_amount),
      usage_limit: coupon.usage_limit == null ? "" : String(coupon.usage_limit),
      usage_limit_per_member: coupon.usage_limit_per_member == null ? "" : String(coupon.usage_limit_per_member),
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : "",
      ends_at: coupon.ends_at ? coupon.ends_at.slice(0, 10) : "",
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.discount_value) {
      toast.error("Code, name, and discount value are required");
      return;
    }

    setSaving(true);
    const payload = {
      gym_id: form.gym_id,
      applies_to_all_gyms: form.applies_to_all_gyms,
      code: form.code,
      name: form.name,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      min_purchase_amount: form.min_purchase_amount ? Number(form.min_purchase_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      usage_limit_per_member: form.usage_limit_per_member ? Number(form.usage_limit_per_member) : null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
    };

    try {
      if (editingCoupon) {
        await api.updateCoupon(editingCoupon.id, payload);
        toast.success("Coupon updated");
      } else {
        await api.createCoupon(payload);
        toast.success("Coupon created");
      }
      setDialogOpen(false);
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      await api.deleteCoupon(couponId);
      toast.success("Coupon deactivated");
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate coupon");
    }
  };

  return (
    <AppLayout title="Coupons">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <BadgePercent className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Coupons</h1>
              <p className="mt-0.5 text-muted-foreground">Create, activate, and manage discount coupons for package sales.</p>
            </div>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Create Coupon</Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name" className="pl-9" />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Coupon</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredCoupons.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No coupons created yet.</TableCell></TableRow>
              ) : filteredCoupons.map((coupon) => {
                const gym = gyms.find((item) => item.id === coupon.gym_id);
                return (
                  <TableRow key={coupon.id} className="hover:bg-muted/30">
                    <TableCell><p className="font-medium">{coupon.code}</p><p className="text-xs text-muted-foreground">{coupon.name}</p></TableCell>
                    <TableCell className="text-sm">{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${Number(coupon.discount_value).toLocaleString()}`}</TableCell>
                    <TableCell className="text-sm">{coupon.gym_id ? gym?.gym_name || "-" : "All gyms"}</TableCell>
                    <TableCell className="text-sm">{coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString() : "Any"} to {coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString() : "Open"}</TableCell>
                    <TableCell>{coupon.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(coupon)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {coupon.is_active ? <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(coupon.id)}><Trash2 className="h-3.5 w-3.5" /></Button> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Welcome Offer" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Optional coupon note" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(value: CouponForm["discount_type"]) => setForm((current) => ({ ...current, discount_type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value</Label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm((current) => ({ ...current, discount_value: e.target.value }))} placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Discount</Label>
                <Input type="number" value={form.max_discount_amount} onChange={(e) => setForm((current) => ({ ...current, max_discount_amount: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Min Purchase</Label>
                <Input type="number" value={form.min_purchase_amount} onChange={(e) => setForm((current) => ({ ...current, min_purchase_amount: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Usage Limit</Label>
                <Input type="number" value={form.usage_limit} onChange={(e) => setForm((current) => ({ ...current, usage_limit: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Usage Limit Per Member</Label>
                <Input type="number" value={form.usage_limit_per_member} onChange={(e) => setForm((current) => ({ ...current, usage_limit_per_member: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <DatePicker value={form.starts_at} onChange={(value) => setForm((current) => ({ ...current, starts_at: value }))} placeholder="Select start date" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <DatePicker value={form.ends_at} onChange={(value) => setForm((current) => ({ ...current, ends_at: value }))} placeholder="Select end date" />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
                <div>
                  <p className="font-medium">Apply to all gyms</p>
                  <p className="text-sm text-muted-foreground">Turn this on to make the coupon available across all branches.</p>
                </div>
                <Switch checked={form.applies_to_all_gyms} onCheckedChange={(checked) => setForm((current) => ({ ...current, applies_to_all_gyms: checked }))} />
              </div>
              {!form.applies_to_all_gyms && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gym</Label>
                  <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                    <SelectContent>
                      {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingCoupon ? (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
                  <div>
                    <p className="font-medium">Coupon active</p>
                    <p className="text-sm text-muted-foreground">Deactivate coupons instead of deleting them permanently.</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="gradient" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
