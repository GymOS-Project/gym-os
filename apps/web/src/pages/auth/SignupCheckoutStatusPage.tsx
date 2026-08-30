import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, type SignupCheckoutStatus } from '@/lib/api';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';

export default function SignupCheckoutStatusPage() {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const [status, setStatus] = useState<SignupCheckoutStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(draftId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      setError('Missing checkout reference.');
      return;
    }

    let stopped = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const next = await api.getSignupCheckoutStatus(draftId, {
          subscription_id: searchParams.get('subscription_id'),
          status: searchParams.get('status'),
          email: searchParams.get('email'),
        });
        if (stopped) return;
        setStatus(next);
        setError(null);

        if (next.status !== 'completed') {
          timer = window.setTimeout(poll, 3000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (stopped) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load checkout status');
      }
    };

    void poll();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [draftId, searchParams]);

  const isCompleted = status?.status === 'completed';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl border-border/70 shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : loading ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <XCircle className="h-7 w-7" />}
          </div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="text-lg font-semibold">GymOS Billing</span>
          </div>
          <CardTitle>{isCompleted ? 'Payment received' : loading ? 'Confirming your payment' : 'Checkout update needed'}</CardTitle>
          <CardDescription>
            {isCompleted
              ? 'Your account has been created successfully. You can sign in and start using GymOS.'
              : loading
                ? 'We are waiting for Dodo Payments to confirm the transaction and finish provisioning your account.'
                : error || 'We could not confirm the payment yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status ? (
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Plan:</span> {status.plan_code}</p>
              <p><span className="font-medium text-foreground">Billing:</span> {status.billing_cycle}</p>
              <p><span className="font-medium text-foreground">Status:</span> {status.status}</p>
              {status.payment ? <p><span className="font-medium text-foreground">Payment:</span> {status.payment.status}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {isCompleted ? (
              <Button asChild variant="gradient">
                <Link to="/login">Go to Login</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/signup">Back to Signup</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
