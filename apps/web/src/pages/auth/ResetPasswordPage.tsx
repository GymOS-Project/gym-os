import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function getResetToken() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hash.get('access_token') || new URLSearchParams(window.location.search).get('access_token') || '';
}

export default function ResetPasswordPage() {
  const accessToken = useMemo(() => getResetToken(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!accessToken) {
      toast.error('Reset link is invalid or expired');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(accessToken, password);
      toast.success('Password reset successful');
      window.location.assign('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
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
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
            <Dumbbell className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>

        {!accessToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one to continue.</p>
            <Button asChild variant="gradient" className="w-full h-11">
              <Link to="/forgot-password">Request New Link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="gradient" className="w-full h-11" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
