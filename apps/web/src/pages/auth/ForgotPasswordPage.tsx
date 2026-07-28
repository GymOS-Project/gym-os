import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setSent(true);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-4">
        <ThemeToggle isToggle className="pointer-events-auto" />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/85 p-8 shadow-elevated backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo className="h-10 w-10" />
          <h1 className="text-2xl font-bold">Forgot Password</h1>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email address and we will send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourgym.com" required />
          </div>
          <Button type="submit" variant="gradient" className="w-full h-11" disabled={loading}>
            {loading ? 'Sending...' : sent ? 'Send Again' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
