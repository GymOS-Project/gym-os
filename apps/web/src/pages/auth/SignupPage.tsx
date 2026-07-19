import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dumbbell, Check, Eye, EyeOff, Building2, User, Lock, Upload, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Gym Profile', description: 'Add each gym or branch profile', icon: Building2 },
  { id: 2, title: 'Owner & Contact', description: 'Capture branch contact details', icon: User },
  { id: 3, title: 'Account & Media', description: 'Set your admin login and optional photos', icon: Lock },
];

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 10;

type GymForm = {
  gym_name: string;
  business_registration_name: string;
  gym_email: string;
  website: string;
  instagram_page: string;
  address: string;
  owner_name: string;
  phone: string;
  owner_email: string;
};

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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gymType, setGymType] = useState<'single' | 'branch'>('single');
  const [branchCount, setBranchCount] = useState(2);
  const [gyms, setGyms] = useState<GymForm[]>([createGymForm(), createGymForm()]);
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gymPhotos, setGymPhotos] = useState<File[]>([]);

  const gymCount = gymType === 'branch' ? branchCount : 1;
  const activeGyms = gyms.slice(0, gymCount);
  const currentGym = activeGyms[activeBranchIndex] || activeGyms[0];
  const currentBranchLabel = gymType === 'branch' ? `Branch ${activeBranchIndex + 1} of ${gymCount}` : 'Primary Gym';

  const updateGymType = (value: 'single' | 'branch') => {
    setGymType(value);
    const nextCount = value === 'branch' ? Math.max(branchCount, 2) : 1;
    setBranchCount(nextCount === 1 ? 2 : nextCount);
    setGyms((current) => resizeGyms(current, value === 'branch' ? nextCount : 1));
    setActiveBranchIndex(0);
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

    if (!accountEmail.trim()) { toast.error('Admin login email is required'); return false; }
    if (!activeGyms.every((gym, index) => validateGymProfile(gym, index) && validateOwnerContact(gym, index))) { return false; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return false; }
    if (gymPhotos.length > MAX_PHOTOS) { toast.error(`You can upload a maximum of ${MAX_PHOTOS} gym photographs`); return false; }
    for (const photo of gymPhotos) {
      if (photo.size > MAX_PHOTO_SIZE) { toast.error(`"${photo.name}" exceeds 10 MB limit`); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    if (gymType === 'branch' && step < 3 && activeBranchIndex < gymCount - 1) {
      setActiveBranchIndex((current) => current + 1);
      return;
    }

    if (step < 3) {
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

    setStep(2);
    setActiveBranchIndex(gymType === 'branch' ? gymCount - 1 : 0);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = gymPhotos.length + files.length;

    if (totalPhotos > MAX_PHOTOS) {
      toast.error(`You can only upload up to ${MAX_PHOTOS} photos. You already have ${gymPhotos.length}.`);
      return;
    }

    const oversized = files.filter((file) => file.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 10 MB limit and were skipped.`);
    }

    setGymPhotos((current) => [...current, ...files.filter((file) => file.size <= MAX_PHOTO_SIZE)]);
  };

  const removePhoto = (index: number) => {
    setGymPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    const payload = new FormData();
    const [primaryGym] = activeGyms;

    payload.append('gym_type', gymType);
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

    const { error, authenticated } = await signUp(payload);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Sign up failed');
      return;
    }

    toast.success(
      authenticated
        ? 'Account created! Welcome to GymOs.'
        : 'Account created! Please sign in to continue.'
    );
    navigate(authenticated ? '/' : '/login');
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-4">
        <ThemeToggle isToggle={true} className="pointer-events-auto" />
      </div>

      <div className="gradient-accent relative hidden overflow-hidden p-12 lg:flex lg:w-2/5 lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary/60"
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
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 backdrop-blur">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Join GymOs</h1>
          <p className="leading-relaxed text-white/75">
            Set up your gym management system for one gym or multiple branches in just a few steps.
          </p>

          <div className="mt-12 space-y-4">
            {STEPS.map((section) => (
              <div
                key={section.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 transition-all',
                  step === section.id ? 'border border-white/20 bg-white/10 backdrop-blur-sm' : 'opacity-55'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                    step > section.id
                      ? 'border-primary bg-primary'
                      : step === section.id
                        ? 'border-primary bg-primary/15'
                        : 'border-white/20'
                  )}
                >
                  {step > section.id ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <section.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{section.title}</p>
                  <p className="text-sm text-white/60">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card/85 p-8 shadow-elevated backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
              <Dumbbell className="h-5 w-5" />
            </div>
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
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Step {step} of 3</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{STEPS[step - 1].title}</h2>
            <p className="text-muted-foreground mt-1">{STEPS[step - 1].description}</p>
          </div>

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-1.5">
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

                <div className="rounded-2xl border bg-muted/20 p-5 space-y-4">
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
                <div className="rounded-2xl border bg-muted/20 p-5 space-y-4">
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

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11">
                  Back
                </Button>
              )}
              <Button type="submit" variant="gradient" className="flex-1 h-11" disabled={loading}>
                {step === 3
                  ? (loading ? 'Creating account...' : 'Create Account')
                  : gymType === 'branch' && activeBranchIndex < gymCount - 1
                    ? `Save & Next ${step === 1 ? 'Branch Profile' : 'Branch Contact'}`
                    : 'Continue'}
              </Button>
            </div>
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
