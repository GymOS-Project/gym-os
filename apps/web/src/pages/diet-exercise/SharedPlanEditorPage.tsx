import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type PlanType = 'diet' | 'exercise';

type Props = {
  planType: PlanType;
};

const planContent = {
  diet: {
    title: 'Diet Plan',
    basePath: '/diet-exercise/diet-plans',
  },
  exercise: {
    title: 'Exercise Plan',
    basePath: '/diet-exercise/exercise-plans',
  },
};

export default function SharedPlanEditorPage({ planType }: Props) {
  const { gyms, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const content = planContent[planType];
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [form, setForm] = useState({
    gym_id: selectedGymId !== 'all' ? selectedGymId : gyms[0]?.id || '',
    name: '',
    description: '',
    content: '',
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
          content: plan.content || '',
          tag: plan.tag || '',
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.gym_id) {
      toast.error('Name and gym are required');
      return;
    }

    setLoading(true);
    try {
      if (planType === 'diet') {
        if (isEditing && id) {
          await api.updateDietPlan(id, form);
        } else {
          await api.createDietPlan(form);
        }
      } else if (isEditing && id) {
        await api.updateExercisePlan(id, form);
      } else {
        await api.createExercisePlan(form);
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
        <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? `Edit ${content.title}` : `Create ${content.title}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
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
                <Label>Content</Label>
                <Textarea value={form.content} onChange={(e) => setField('content', e.target.value)} placeholder="Detailed plan content" className="min-h-[220px]" />
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
