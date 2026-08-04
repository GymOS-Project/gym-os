import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getFeatureLabel, getFeatureMinimumPlan } from '@/lib/billing';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FeatureLockedPage({ feature }: { feature: BillingFeatureKey }) {
  const { admin } = useAuth();
  const minimumPlan = getFeatureMinimumPlan(feature);

  return (
    <AppLayout title="Upgrade Required">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle>Upgrade required for {getFeatureLabel(feature)}</CardTitle>
            <CardDescription>
              Your current plan is <span className="font-medium text-foreground">{admin?.subscription?.plan_name || 'Legacy'}</span>.
              Unlock this feature with the <span className="font-medium text-foreground">{minimumPlan.charAt(0).toUpperCase() + minimumPlan.slice(1)}</span> plan or above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Billing upgrades are now plan-driven. If you want this module enabled for your gym account, move to the next tier from onboarding or contact support to migrate your current subscription.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link to="/settings">Go to Settings</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:support@gymos.app?subject=Plan%20Upgrade%20Request">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
