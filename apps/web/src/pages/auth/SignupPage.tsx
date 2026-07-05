import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Check, Eye, EyeOff, Building2, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Gym Info', description: 'Tell us about your gym', icon: Building2 },
  { id: 2, title: 'Owner Details', description: 'Your personal info', icon: User },
  { id: 3, title: 'Account', description: 'Create your login', icon: Lock },
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    gym_name: '',
    address: '',
    owner_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const validateStep = () => {
    if (step === 1) {
      if (!formData.gym_name.trim()) { toast.error('Gym name is required'); return false; }
    }
    if (step === 2) {
      if (!formData.owner_name.trim()) { toast.error('Owner name is required'); return false; }
      if (!formData.phone.trim()) { toast.error('Phone number is required'); return false; }
    }
    if (step === 3) {
      if (!formData.email.trim()) { toast.error('Email is required'); return false; }
      if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
      if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, {
      gym_name: formData.gym_name,
      owner_name: formData.owner_name,
      phone: formData.phone,
      address: formData.address,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Sign up failed');
    } else {
      toast.success('Account created! Welcome to GymPro.');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-teal-400"
              style={{
                width: `${Math.random() * 200 + 50}px`,
                height: `${Math.random() * 200 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-500/30 backdrop-blur">
              <Dumbbell className="h-10 w-10 text-teal-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Join GymPro</h1>
          <p className="text-slate-300 leading-relaxed">
            Set up your gym management system in just a few steps and start managing your members today.
          </p>

          {/* Step indicators on left */}
          <div className="mt-12 space-y-4">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 transition-all',
                  step === s.id ? 'bg-white/10 border border-white/20' : 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                    step > s.id
                      ? 'bg-teal-500 border-teal-500'
                      : step === s.id
                      ? 'border-teal-400 bg-teal-500/20'
                      : 'border-slate-600'
                  )}
                >
                  {step > s.id ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <s.icon className="h-5 w-5 text-teal-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{s.title}</p>
                  <p className="text-slate-400 text-sm">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">GymPro</h1>
          </div>

          {/* Mobile step progress */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  step >= s.id ? 'bg-teal-500' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <div className="mb-8">
            <p className="text-sm text-teal-600 font-medium uppercase tracking-wide">Step {step} of 3</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{STEPS[step - 1].title}</h2>
            <p className="text-muted-foreground mt-1">{STEPS[step - 1].description}</p>
          </div>

          <form onSubmit={step === 3 ? handleSubmit : e => { e.preventDefault(); nextStep(); }}>
            {/* Step 1: Gym Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="gym_name">Gym Name *</Label>
                  <Input
                    id="gym_name"
                    value={formData.gym_name}
                    onChange={e => update('gym_name', e.target.value)}
                    placeholder="e.g. FitZone Gym"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={e => update('address', e.target.value)}
                    placeholder="Gym address"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Owner Details */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="owner_name">Owner Name *</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={e => update('owner_name', e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Account */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="admin@yourgym.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => update('password', e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11">
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white"
                disabled={loading}
              >
                {step === 3 ? (loading ? 'Creating account...' : 'Create Account') : 'Continue'}
              </Button>
            </div>
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
