import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard as Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { PackageType } from '@/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PackageTypesPage() {
  const { admin } = useAuth();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<PackageType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', duration_months: '', duration_days: '', price: '', description: '' });
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (admin) fetchPackages(); }, [admin]);

  const fetchPackages = async () => {
    if (!admin) return;
    setLoading(true);
    const { data } = await supabase.from('package_types').select('*').eq('admin_id', admin.id).order('created_at');
    setPackages(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditPkg(null);
    setForm({ name: '', duration_months: '', duration_days: '', price: '', description: '' });
    setIsCustom(false);
    setDialogOpen(true);
  };

  const openEdit = (pkg: PackageType) => {
    setEditPkg(pkg);
    setIsCustom(!pkg.duration_months);
    setForm({
      name: pkg.name,
      duration_months: String(pkg.duration_months || ''),
      duration_days: String(pkg.duration_days || ''),
      price: String(pkg.price),
      description: pkg.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!admin || !form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    const payload = {
      admin_id: admin.id,
      name: form.name,
      duration_months: isCustom ? null : (parseInt(form.duration_months) || null),
      duration_days: isCustom ? (parseInt(form.duration_days) || null) : null,
      price: parseFloat(form.price),
      description: form.description || null,
    };

    const { error } = editPkg
      ? await supabase.from('package_types').update(payload).eq('id', editPkg.id)
      : await supabase.from('package_types').insert(payload);

    setSaving(false);
    if (error) { toast.error('Failed to save package'); return; }
    toast.success(editPkg ? 'Package updated' : 'Package added');
    setDialogOpen(false);
    fetchPackages();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('package_types').delete().eq('id', deleteId);
    if (error) toast.error('Failed to delete');
    else { toast.success('Package deleted'); fetchPackages(); }
    setDeleteId(null);
  };

  const toggleActive = async (pkg: PackageType) => {
    await supabase.from('package_types').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    fetchPackages();
  };

  const presets = [
    { name: '1 Month', months: 1, price: 1500 },
    { name: '3 Months', months: 3, price: 4000 },
    { name: '6 Months', months: 6, price: 7000 },
    { name: '12 Months', months: 12, price: 12000 },
  ];

  return (
    <AppLayout title="Package Types">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Package Types</h1>
            <p className="text-muted-foreground mt-1">Define your gym subscription packages</p>
          </div>
          <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Package
          </Button>
        </div>

        {packages.length === 0 && !loading && (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No packages yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Start with our presets or create custom packages</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {presets.map(p => (
                <Button key={p.name} variant="outline" size="sm"
                  onClick={() => { setForm({ name: p.name, duration_months: String(p.months), duration_days: '', price: String(p.price), description: '' }); setIsCustom(false); setEditPkg(null); setDialogOpen(true); }}>
                  {p.name} — ₹{p.price.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map(pkg => (
            <div key={pkg.id} className={`rounded-xl border bg-card p-5 transition-all ${!pkg.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pkg.duration_months ? `${pkg.duration_months} month${pkg.duration_months > 1 ? 's' : ''}` : pkg.duration_days ? `${pkg.duration_days} days` : 'Custom'}
                  </p>
                </div>
                <Badge variant={pkg.is_active ? 'default' : 'secondary'} className={pkg.is_active ? 'bg-teal-100 text-teal-700 border-teal-200' : ''}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-teal-600">₹{Number(pkg.price).toLocaleString()}</p>
              {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <Switch checked={pkg.is_active} onCheckedChange={() => toggleActive(pkg)} />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(pkg.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editPkg ? 'Edit Package' : 'Add Package Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Package Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Monthly, Quarterly" />
            </div>
            <div className="flex items-center gap-3">
              <Label>Custom Duration</Label>
              <Switch checked={isCustom} onCheckedChange={setIsCustom} />
            </div>
            {!isCustom ? (
              <div className="space-y-1.5">
                <Label>Duration (Months)</Label>
                <Input type="number" value={form.duration_months} onChange={e => setForm(p => ({ ...p, duration_months: e.target.value }))} placeholder="e.g. 1, 3, 6, 12" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Duration (Days)</Label>
                <Input type="number" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: e.target.value }))} placeholder="e.g. 45, 90" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Price (₹) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving...' : editPkg ? 'Update' : 'Add Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the package type. Existing member subscriptions won't be affected.</AlertDialogDescription>
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
