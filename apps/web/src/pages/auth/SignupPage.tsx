import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BILLING_PLANS, BILLING_TRIAL_DAYS } from '@/lib/billing';
import { ThemeToggle } from '@/components/theme-toggle';
import { MAX_IMAGE_SIZE_BYTES, MAX_SIGNUP_PHOTOS as MAX_PHOTOS, MAX_SIGNUP_PHOTOS, SIGNUP_STEPS as STEPS } from '@/utils/constants';
import { Check, Eye, EyeOff, Upload, X, ImagePlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function createGymForm(): GymForm {
  return {
    gym_name: '',
    business_registration_name: '',
    gym_email: '',
    website: '',
    instagram_page: '',
    address: '',
    owner_name: '',
    phone: '',
    owner_email: '',
  };
}

function resizeGyms(existing: GymForm[], count: number) {
  if (existing.length === count) {
    return existing;
  }

  if (existing.length > count) {
    return existing.slice(0, count);
  }

  return [...existing, ...Array.from({ length: count - existing.length }, () => createGymForm())];
}

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [loadingAction, setLoadingAction] = useState<'trial' | 'purchase' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [gymType, setGymType] = useState<'single' | 'branch'>('single');
  const [branchCount, setBranchCount] = useState(2);
  const [gyms, setGyms] = useState<GymForm[]>([createGymForm(), createGymForm()]);
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gymPhotos, setGymPhotos] = useState<File[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanCode>('starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const gymCount = gymType === 'branch' ? branchCount : 1;
  const activeGyms = gyms.slice(0, gymCount);
  const currentGym = activeGyms[activeBranchIndex] || activeGyms[0];
  const currentBranchLabel = gymType === 'branch' ? `Branch ${activeBranchIndex + 1} of ${gymCount}` : 'Primary Gym';
  const loading = loadingAction !== null;
  const selectedPlanDetails = BILLING_PLANS[selectedPlan];
  const selectedPlanPrice = billingCycle === 'yearly' ? selectedPlanDetails.yearlyPrice : selectedPlanDetails.monthlyPrice;

  const updateGymType = (value: 'single' | 'branch') => {
    setGymType(value);
    const nextCount = value === 'branch' ? Math.max(branchCount, 2) : 1;
    setBranchCount(nextCount === 1 ? 2 : nextCount);
    setGyms((current) => resizeGyms(current, value === 'branch' ? nextCount : 1));
    setActiveBranchIndex(0);
    setSelectedPlan((current) => value === 'branch' && current !== 'scale' ? 'scale' : current);
  };

  const updateBranchCount = (value: string) => {
    const parsed = Math.max(2, Number(value) || 2);
    setBranchCount(parsed);
    setGyms((current) => resizeGyms(current, parsed));
    setActiveBranchIndex((current) => Math.min(current, parsed - 1));
  };

  const updateGym = (index: number, field: keyof GymForm, value: string) => {
    setGyms((current) => current.map((gym, gymIndex) => (
      gymIndex === index ? { ...gym, [field]: value } : gym
    )));
  };

  const validateGymProfile = (gym: GymForm | undefined, index: number) => {
    if (!gym) {
      toast.error('Gym details are missing');
      return false;
    }

    if (!gym.gym_name.trim()) { toast.error(`Gym name is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    if (!gym.business_registration_name.trim()) { toast.error(`Business registration name is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    if (!gym.gym_email.trim()) { toast.error(`Gym email is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    return true;
  };

  const validateOwnerContact = (gym: GymForm | undefined, index: number) => {
    if (!gym) {
      toast.error('Gym contact details are missing');
      return false;
    }

    if (!gym.owner_name.trim()) { toast.error(`Owner name is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    if (!gym.phone.trim()) { toast.error(`Phone number is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    if (!gym.owner_email.trim()) { toast.error(`Owner email is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    if (!gym.address.trim()) { toast.error(`Address is required for ${gymType === 'branch' ? `branch ${index + 1}` : 'your gym'}`); return false; }
    return true;
  };

  const validateStep = () => {
    if (step === 1) {
      if (!gymType) {
        toast.error('Gym type is required');
        return false;
      }

      if (gymType === 'branch' && branchCount < 2) {
        toast.error('Branch gyms must have at least 2 branches');
        return false;
      }

      return validateGymProfile(currentGym, activeBranchIndex);
    }

    if (step === 2) {
      return validateOwnerContact(currentGym, activeBranchIndex);
    }

    if (step === 3) {
      if (!accountEmail.trim()) { toast.error('Admin login email is required'); return false; }
      if (!activeGyms.every((gym, index) => validateGymProfile(gym, index) && validateOwnerContact(gym, index))) { return false; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
      if (password !== confirmPassword) { toast.error('Passwords do not match'); return false; }
      if (gymPhotos.length > MAX_SIGNUP_PHOTOS) { toast.error(`You can upload a maximum of ${MAX_SIGNUP_PHOTOS} gym photographs`); return false; }
      for (const photo of gymPhotos) {
        if (photo.size > MAX_IMAGE_SIZE_BYTES) { toast.error(`"${photo.name}" exceeds 10 MB limit`); return false; }
      }
      return true;
    }

    if (gymType === 'branch' && selectedPlan !== 'scale') {
      toast.error('Branch onboarding is available on the Scale plan only');
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    if (gymType === 'branch' && step < 3 && activeBranchIndex < gymCount - 1) {
      setActiveBranchIndex((current) => current + 1);
      return;
    }

    if (step < 4) {
      setStep((current) => current + 1);
      setActiveBranchIndex(0);
    }
  };

  const prevStep = () => {
    if (step === 1) {
      if (gymType === 'branch' && activeBranchIndex > 0) {
        setActiveBranchIndex((current) => current - 1);
      }
      return;
    }

    if (step === 2) {
      if (gymType === 'branch' && activeBranchIndex > 0) {
        setActiveBranchIndex((current) => current - 1);
        return;
      }

      setStep(1);
      setActiveBranchIndex(gymType === 'branch' ? gymCount - 1 : 0);
      return;
    }

    if (step === 4) {
      setStep(3);
      return;
    }

    setStep(2);
    setActiveBranchIndex(gymType === 'branch' ? gymCount - 1 : 0);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = gymPhotos.length + files.length;

    if (totalPhotos > MAX_SIGNUP_PHOTOS) {
      toast.error(`You can only upload up to ${MAX_SIGNUP_PHOTOS} photos. You already have ${gymPhotos.length}.`);
      return;
    }

    const oversized = files.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 10 MB limit and were skipped.`);
    }

    setGymPhotos((current) => [...current, ...files.filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES)]);
  };

  const removePhoto = (index: number) => {
    setGymPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const createSignupPayload = () => {
    if (!validateStep()) return;

    const payload = new FormData();
    const [primaryGym] = activeGyms;

    payload.append('gym_type', gymType);
    payload.append('plan_code', selectedPlan);
    payload.append('billing_cycle', billingCycle);
    payload.append('email', accountEmail);
    payload.append('account_email', accountEmail);
    payload.append('password', password);
    payload.append('branches_payload', JSON.stringify(activeGyms));
    payload.append('gym_name', primaryGym.gym_name);
    payload.append('business_registration_name', primaryGym.business_registration_name);
    payload.append('gym_email', primaryGym.gym_email);
    payload.append('website', primaryGym.website);
    payload.append('instagram_page', primaryGym.instagram_page);
    payload.append('address', primaryGym.address);
    payload.append('owner_name', primaryGym.owner_name);
    payload.append('phone', primaryGym.phone);
    payload.append('owner_email', primaryGym.owner_email);

    gymPhotos.forEach((photo, index) => {
      payload.append(`gym_photos[${index}]`, photo);
    });

    return payload;
  };

  const handleTrialStart = async () => {
    const payload = createSignupPayload();
    if (!payload) return;

    payload.append('start_trial', 'true');
    setLoadingAction('trial');

    const { error, authenticated } = await signUp(payload);
    setLoadingAction(null);

    if (error) {
      toast.error(error.message || 'Sign up failed');
      return;
    }

    toast.success(
      authenticated
        ? `Your ${BILLING_TRIAL_DAYS}-day free trial has started.`
        : 'Account created! Please sign in to continue.'
    );
    navigate(authenticated ? '/' : '/login');
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-4">
        <ThemeToggle isToggle={true} className="pointer-events-auto" />
      </div>

      <AuthShowcasePanel mode="signup" step={step} steps={STEPS} />

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-3xl p-8">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <BrandLogo className="h-10 w-10" />
            <h1 className="text-2xl font-bold">GymOs</h1>
          </div>

          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {STEPS.map((section) => (
              <div
                key={section.id}
                className={cn('h-1.5 flex-1 rounded-full transition-all', step >= section.id ? 'bg-primary' : 'bg-muted')}
              />
            ))}
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Step {step} of 4</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{STEPS[step - 1].title}</h2>
            <p className="text-muted-foreground mt-1">{STEPS[step - 1].description}</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (step < 4) nextStep();
          }}>
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-1.5 sm:max-w-[220px]">
                    <Label htmlFor="gym_type">Gym Type *</Label>
                    <Select value={gymType} onValueChange={updateGymType}>
                      <SelectTrigger id="gym_type">
                        <SelectValue placeholder="Select gym type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="branch">Branch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gymType === 'branch' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="branch_count">Number of Branches *</Label>
                      <Input
                        id="branch_count"
                        type="number"
                        min={2}
                        value={branchCount}
                        onChange={(e) => updateBranchCount(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{gymType === 'branch' ? currentBranchLabel : 'Gym Details'}</h3>
                      <p className="text-sm text-muted-foreground">Profile details used throughout your admin records.</p>
                    </div>
                    {gymType === 'branch' && (
                      <div className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        Fill one branch at a time
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Gym Name *</Label>
                      <Input value={currentGym?.gym_name || ''} onChange={(e) => updateGym(activeBranchIndex, 'gym_name', e.target.value)} placeholder="e.g. FitZone Gym" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Business Registration Name *</Label>
                      <Input value={currentGym?.business_registration_name || ''} onChange={(e) => updateGym(activeBranchIndex, 'business_registration_name', e.target.value)} placeholder="Registered business name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gym Email Address *</Label>
                      <Input type="email" value={currentGym?.gym_email || ''} onChange={(e) => updateGym(activeBranchIndex, 'gym_email', e.target.value)} placeholder="contact@yourgym.com" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input value={currentGym?.website || ''} onChange={(e) => updateGym(activeBranchIndex, 'website', e.target.value)} placeholder="https://yourgym.com" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Instagram Page</Label>
                      <Input value={currentGym?.instagram_page || ''} onChange={(e) => updateGym(activeBranchIndex, 'instagram_page', e.target.value)} placeholder="https://instagram.com/yourgym" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{gymType === 'branch' ? currentBranchLabel : 'Owner & Contact'}</h3>
                      <p className="text-sm text-muted-foreground">Who runs this gym and how members can reach them.</p>
                    </div>
                    {gymType === 'branch' && (
                      <div className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        Fill one branch at a time
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Owner Name *</Label>
                      <Input value={currentGym?.owner_name || ''} onChange={(e) => updateGym(activeBranchIndex, 'owner_name', e.target.value)} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number *</Label>
                      <Input value={currentGym?.phone || ''} onChange={(e) => updateGym(activeBranchIndex, 'phone', e.target.value)} placeholder="+91 9876543210" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Owner Email Address *</Label>
                      <Input type="email" value={currentGym?.owner_email || ''} onChange={(e) => updateGym(activeBranchIndex, 'owner_email', e.target.value)} placeholder="owner@yourgym.com" required />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Gym Full Address *</Label>
                      <Input value={currentGym?.address || ''} onChange={(e) => updateGym(activeBranchIndex, 'address', e.target.value)} placeholder="Full gym address" required />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="account_email">Admin Login Email *</Label>
                  <Input
                    id="account_email"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Gym Photographs
                    <span className="text-muted-foreground font-normal ml-1">(optional, up to {MAX_PHOTOS})</span>
                  </Label>
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                    <div className="flex flex-col gap-3">
                      {gymPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {gymPhotos.map((photo, index) => (
                            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-background">
                              <img src={URL.createObjectURL(photo)} alt={photo.name} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                                {photo.name}
                              </span>
                            </div>
                          ))}
                          {gymPhotos.length < MAX_PHOTOS && (
                            <label
                              htmlFor="gym_photo"
                              className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 transition-colors hover:border-primary/50 hover:bg-primary/10"
                            >
                              <ImagePlus className="mb-1 h-6 w-6 text-primary" />
                              <span className="text-xs font-medium text-primary">Add Photo</span>
                            </label>
                          )}
                        </div>
                      )}

                      {gymPhotos.length === 0 && (
                        <label htmlFor="gym_photo" className="flex flex-col items-center justify-center py-6 cursor-pointer">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Upload gym photographs</p>
                          <p className="text-xs text-muted-foreground mt-1">Optional during onboarding. You can also add them later from the admin panel.</p>
                        </label>
                      )}

                      <Input id="gym_photo" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">14-day free trial on every plan</p>
                    <p className="mt-1 text-sm text-muted-foreground">No card required for the trial. Choose a plan now and decide whether to start free or purchase immediately.</p>
                  </div>
                  <div className="inline-flex rounded-full border bg-background p-1">
                    <button type="button" onClick={() => setBillingCycle('monthly')} className={cn('rounded-full px-4 py-2 text-sm transition-colors', billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                      Monthly
                    </button>
                    <button type="button" onClick={() => setBillingCycle('yearly')} className={cn('rounded-full px-4 py-2 text-sm transition-colors', billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                      Yearly
                    </button>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border bg-card/70 p-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="pricing_plan">Plan *</Label>
                    <Select value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as BillingPlanCode)}>
                      <SelectTrigger id="pricing_plan">
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter" disabled={gymType === 'branch'}>Starter</SelectItem>
                        <SelectItem value="growth" disabled={gymType === 'branch'}>Growth</SelectItem>
                        <SelectItem value="scale">Scale</SelectItem>
                      </SelectContent>
                    </Select>
                    {gymType === 'branch' ? <p className="text-xs text-muted-foreground">Branch onboarding requires the Scale plan.</p> : null}
                  </div>

                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{selectedPlanDetails.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedPlanDetails.tagline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-foreground">₹{selectedPlanPrice.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">per {billingCycle === 'yearly' ? 'year' : 'month'}</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {selectedPlanDetails.featuredBullets.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border bg-background/80 p-3 text-sm text-muted-foreground">
                        <p className="text-xs uppercase tracking-wide">Staff</p>
                        <p className="mt-1 font-medium text-foreground">Up to {selectedPlanDetails.limits.max_staff_accounts}</p>
                      </div>
                      <div className="rounded-xl border bg-background/80 p-3 text-sm text-muted-foreground">
                        <p className="text-xs uppercase tracking-wide">Members</p>
                        <p className="mt-1 font-medium text-foreground">Up to {selectedPlanDetails.limits.max_active_members.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border bg-background/80 p-3 text-sm text-muted-foreground">
                        <p className="text-xs uppercase tracking-wide">Gyms</p>
                        <p className="mt-1 font-medium text-foreground">{selectedPlanDetails.limits.max_gyms} {selectedPlanDetails.limits.max_gyms === 1 ? 'gym' : 'gyms'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                    <p>
                      All plans include members, packages, shifts, manual attendance, diet plans, exercise plans, invoices, collections,
                      enquiries, followups, and the core dashboard. Growth adds classes, PT, coupons, and analytics. Scale unlocks branch gyms,
                      eSSL, payroll, and activity logs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step < 4 ? (
              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11">
                    Back
                  </Button>
                )}
                <Button type="submit" variant="gradient" className="flex-1 h-11" disabled={loading}>
                  {gymType === 'branch' && activeBranchIndex < gymCount - 1
                    ? `Save & Next ${step === 1 ? 'Branch Profile' : 'Branch Contact'}`
                    : 'Continue'}
                </Button>
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={prevStep} className="h-11">
                    Back
                  </Button>
                  <Button type="button" variant="accent" className="h-11" disabled={loading} onClick={handleTrialStart}>
                    {loadingAction === 'trial' ? 'Starting trial...' : `Start ${BILLING_TRIAL_DAYS}-Day Trial`}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Selected plan: <span className="font-medium text-foreground">{selectedPlanDetails.name}</span> · ₹{selectedPlanPrice.toLocaleString()} / {billingCycle === 'yearly' ? 'year' : 'month'}
                </p>
              </div>
            )}
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
