import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanContentPreviewDialog } from '@/components/plans/PlanContentPreviewDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { SHARED_PLAN_CONTENT_CONFIG } from '@/utils/constants';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
export default function SharedPlanListPage({ planType }: SharedPlanPageProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SharedPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<SharedPlanRecord | null>(null);
  const content = SHARED_PLAN_CONTENT_CONFIG[planType];

  const fetchPlans = async () => {
    setLoading(true);
    try {
      setPlans(planType === 'diet' ? await api.getDietPlans() : await api.getExercisePlans());
    } catch (error: any) {
      toast.error(error.message || `Failed to load ${content.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [planType]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      if (planType === 'diet') {
        await api.deleteDietPlan(deleteId);
      } else {
        await api.deleteExercisePlan(deleteId);
      }
      toast.success(`${content.singular} deleted`);
      await fetchPlans();
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${content.singular.toLowerCase()}`);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (plan: SharedPlanRecord) => {
    setSavingId(plan.id);
    try {
      if (planType === 'diet') {
        await api.updateDietPlan(plan.id, { is_active: !plan.is_active });
      } else {
        await api.updateExercisePlan(plan.id, { is_active: !plan.is_active });
      }
      await fetchPlans();
    } catch (error: any) {
      toast.error(error.message || `Failed to update ${content.singular.toLowerCase()}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout title={content.title}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <p className="mt-1 text-muted-foreground">Shared templates that can be assigned to members and customized per member later.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate(`${content.basePath}/create`)}>
            <Plus className="h-4 w-4" /> Create {content.singular}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></TableCell></TableRow>
              ) : plans.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">{content.empty}</TableCell></TableRow>
              ) : plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{plan.name}</p>
                        <Badge variant="outline">{plan.content_type === 'pdf' ? 'PDF' : 'Rich Text'}</Badge>
                      </div>
                      {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{plan.tag || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Switch checked={plan.is_active} disabled={savingId === plan.id} onCheckedChange={() => toggleActive(plan)} />
                    </div>
                  </TableCell>
                  <TableCell>{new Date(plan.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewPlan(plan)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`${content.basePath}/${plan.id}/edit`)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(plan.id)}>
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

      <DeleteConfirmationDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${content.singular}?`}
        description="This removes the shared template. Member-specific custom copies will remain untouched."
        onConfirm={handleDelete}
      />

      <PlanContentPreviewDialog
        open={Boolean(previewPlan)}
        onOpenChange={(open) => !open && setPreviewPlan(null)}
        title={previewPlan?.name || `Preview ${content.singular}`}
        value={previewPlan}
      />
    </AppLayout>
  );
}
