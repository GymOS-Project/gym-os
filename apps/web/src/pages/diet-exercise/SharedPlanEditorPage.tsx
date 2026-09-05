import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlanContentEditor } from '@/components/plans/PlanContentEditor';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { buildPlanFormData, createPlanEditorValue, type PlanEditorValue } from '@/lib/planContent';
import { useAuth } from '@/contexts/AuthContext';
import { SHARED_PLAN_CONTENT_CONFIG } from '@/utils/constants';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
export default function SharedPlanEditorPage({ planType }: SharedPlanPageProps) {
  const { gyms, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const content = SHARED_PLAN_CONTENT_CONFIG[planType];
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [planContentValue, setPlanContentValue] = useState<PlanEditorValue>(createPlanEditorValue());
  const [form, setForm] = useState({
    gym_id: selectedGymId !== 'all' ? selectedGymId : gyms[0]?.id || '',
    name: '',
    description: '',
    tag: '',
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: selectedGymId !== 'all' ? selectedGymId : current.gym_id || gyms[0]?.id || '',
    }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    if (!id) return;
    setPageLoading(true);
    const load = planType === 'diet' ? api.getDietPlan(id) : api.getExercisePlan(id);
    load
      .then((plan) => {
        setForm({
          gym_id: plan.gym_id,
          name: plan.name,
          description: plan.description || '',
          tag: plan.tag || '',
        });
        setPlanContentValue(createPlanEditorValue(plan));
      })
      .catch((error: any) => {
        toast.error(error.message || `Failed to load ${content.title.toLowerCase()}`);
        navigate(content.basePath);
      })
      .finally(() => setPageLoading(false));
  }, [content.basePath, content.title, id, navigate, planType]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.name || !form.gym_id) {
      toast.error('Name and gym are required');
      return;
    }

    setLoading(true);
    try {
      const payload = buildPlanFormData(
        {
          gym_id: form.gym_id,
          name: form.name,
          description: form.description || null,
          tag: form.tag || null,
        },
        planContentValue,
      );

      if (planType === 'diet') {
        if (isEditing && id) {
          await api.updateDietPlan(id, payload);
        } else {
          await api.createDietPlan(payload);
        }
      } else if (isEditing && id) {
        await api.updateExercisePlan(id, payload);
      } else {
        await api.createExercisePlan(payload);
      }

      toast.success(`${content.title} ${isEditing ? 'updated' : 'created'}`);
      navigate(content.basePath);
    } catch (error: any) {
      toast.error(error.message || `Failed to save ${content.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <AppLayout title={isEditing ? `Edit ${content.title}` : `Create ${content.title}`}>
        <div className="flex min-h-[320px] items-center justify-center"><LoadingSpinner /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? `Edit ${content.title}` : `Create ${content.title}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2 mb-4 -ml-2" onClick={() => navigate(content.basePath)}>
            <ArrowLeft className="h-4 w-4" /> Back to {content.title}
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? `Edit ${content.title}` : `Create ${content.title}`}</h1>
          <p className="mt-1 text-muted-foreground">Build a reusable shared template that can later be customized per member.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Gym *</Label>
                <Select value={form.gym_id} onValueChange={(value) => setField('gym_id', value)}>
                  <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                  <SelectContent>
                    {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder={`${content.title} name`} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tag</Label>
                <Input value={form.tag} onChange={(e) => setField('tag', e.target.value)} placeholder="e.g. Weight loss, Strength, Morning" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Short summary" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Plan Content</Label>
                <PlanContentEditor value={planContentValue} onChange={setPlanContentValue} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(content.basePath)}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={loading}>{loading ? 'Saving...' : isEditing ? `Update ${content.title}` : `Create ${content.title}`}</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
