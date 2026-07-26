import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PERMISSIONS = ['members', 'diet_plans', 'exercise_plans'];

export default function TrainersPage() {
  const { gyms } = useAuth();
  const [trainers, setTrainers] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<StaffAccount | null>(null);
  const [form, setForm] = useState({
    gym_id: gyms[0]?.id || '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    specializations: '',
    is_active: true,
    permissions: new Set<string>(DEFAULT_PERMISSIONS),
  });

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      setTrainers(await api.getTrainers());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, gym_id: current.gym_id || gyms[0]?.id || '' }));
  }, [gyms]);

  const openCreate = () => {
    setEditingTrainer(null);
    setForm({
      gym_id: gyms[0]?.id || '',
      full_name: '',
      email: '',
      password: '',
      phone: '',
      specializations: '',
      is_active: true,
      permissions: new Set<string>(DEFAULT_PERMISSIONS),
    });
    setDialogOpen(true);
  };

  const openEdit = (trainer: StaffAccount) => {
    setEditingTrainer(trainer);
    setForm({
      gym_id: trainer.gym_id,
      full_name: trainer.full_name,
      email: trainer.email,
      password: '',
      phone: trainer.phone || '',
      specializations: trainer.specializations || '',
      is_active: trainer.is_active,
      permissions: new Set<string>(trainer.section_permissions),
    });
    setDialogOpen(true);
  };

  const togglePermission = (permission: string, checked: boolean) => {
    setForm((current) => {
      const next = new Set(current.permissions);
      if (checked) next.add(permission);
      else next.delete(permission);
      return { ...current, permissions: next };
    });
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.gym_id || (!editingTrainer && !form.password)) {
      toast.error('Name, email, gym, and password are required for new trainers');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        gym_id: form.gym_id,
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        specializations: form.specializations || null,
        is_active: form.is_active,
        section_permissions: Array.from(form.permissions),
        role: 'trainer' as const,
      };

      if (editingTrainer) {
        await api.updateTrainer(editingTrainer.id, payload);
        toast.success('Trainer updated');
      } else {
        await api.createTrainer(payload);
        toast.success('Trainer created');
      }

      setDialogOpen(false);
      await fetchTrainers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save trainer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Trainers">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Trainers</h1>
            <p className="mt-1 text-muted-foreground">Create trainer accounts, connect them to a gym, and control what they can access.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Add Trainer</Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Trainer</TableHead>
                <TableHead>Gym</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : trainers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No trainers created yet.</TableCell></TableRow>
              ) : trainers.map((trainer) => {
                const gym = gyms.find((item) => item.id === trainer.gym_id);
                return (
                  <TableRow key={trainer.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-medium">{trainer.full_name}</p>
                      <p className="text-xs text-muted-foreground">{trainer.email}</p>
                    </TableCell>
                    <TableCell>{gym?.gym_name || '—'}</TableCell>
                    <TableCell>{trainer.specializations || '—'}</TableCell>
                    <TableCell>{trainer.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(trainer)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTrainer ? 'Edit Trainer' : 'Create Trainer'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Gym</Label>
              <Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                <SelectContent>
                  {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} disabled={Boolean(editingTrainer)} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            {!editingTrainer && (
              <div className="space-y-1.5">
                <Label>Temporary Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Specializations</Label>
              <Input value={form.specializations} onChange={(e) => setForm((current) => ({ ...current, specializations: e.target.value }))} placeholder="e.g. Strength, Nutrition, Rehab" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Permissions</Label>
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                {['members', 'diet_plans', 'exercise_plans'].map((permission) => (
                  <label key={permission} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm capitalize">
                    <span>{permission.replace('_', ' ')}</span>
                    <Switch checked={form.permissions.has(permission)} onCheckedChange={(checked) => togglePermission(permission, checked)} />
                  </label>
                ))}
              </div>
            </div>
            {editingTrainer && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
                <div>
                  <p className="font-medium">Active account</p>
                  <p className="text-sm text-muted-foreground">Inactive trainers cannot log in.</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" variant="gradient" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingTrainer ? 'Update Trainer' : 'Create Trainer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
