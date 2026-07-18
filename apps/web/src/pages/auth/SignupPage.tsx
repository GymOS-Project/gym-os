import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dumbbell, Check, Eye, EyeOff, Building2, User, Lock, Upload, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Gym Profile', description: 'Basic gym and business details', icon: Building2 },
  { id: 2, title: 'Owner & Contact', description: 'Who runs the gym and how to reach them', icon: User },
  { id: 3, title: 'Account & Media', description: 'Login details and gym photos', icon: Lock },
];

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MIN_PHOTOS = 8;
const MAX_PHOTOS = 10;

export default function SignupPage() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    gym_name: '',
    business_registration_name: '',
    gym_email: '',
    website: '',
    instagram_page: '',
    address: '',
    owner_name: '',
    phone: '',
    owner_email: '',
    password: '',
    confirmPassword: '',
  });
  const [gymPhotos, setGymPhotos] = useState<File[]>([]);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const validateStep = () => {
    if (step === 1) {
      if (!formData.gym_name.trim()) { toast.error('Gym name is required'); return false; }
      if (!formData.business_registration_name.trim()) { toast.error('Business registration name is required'); return false; }
      if (!formData.gym_email.trim()) { toast.error('Gym email address is required'); return false; }
    }
    if (step === 2) {
      if (!formData.owner_name.trim()) { toast.error('Owner name is required'); return false; }
      if (!formData.phone.trim()) { toast.error('Phone number is required'); return false; }
      if (!formData.address.trim()) { toast.error('Gym full address is required'); return false; }
      if (!formData.owner_email.trim()) { toast.error('Owner email address is required'); return false; }
    }
    if (step === 3) {
      if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
      if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return false; }
      if (gymPhotos.length < MIN_PHOTOS) { toast.error(`Please upload at least ${MIN_PHOTOS} gym photographs`); return false; }
      if (gymPhotos.length > MAX_PHOTOS) { toast.error(`You can upload a maximum of ${MAX_PHOTOS} gym photographs`); return false; }
      for (const photo of gymPhotos) {
        if (photo.size > MAX_PHOTO_SIZE) { toast.error(`"${photo.name}" exceeds 10 MB limit`); return false; }
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = gymPhotos.length + files.length;

    if (totalPhotos > MAX_PHOTOS) {
      toast.error(`You can only upload up to ${MAX_PHOTOS} photos. You already have ${gymPhotos.length}.`);
      return;
    }

    const oversized = files.filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 10 MB limit and were skipped.`);
    }

    const validFiles = files.filter(f => f.size <= MAX_PHOTO_SIZE);
    setGymPhotos(prev => [...prev, ...validFiles]);
  };

  const removePhoto = (index: number) => {
    setGymPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    const payload = new FormData();
    payload.append('gym_name', formData.gym_name);
    payload.append('business_registration_name', formData.business_registration_name);
    payload.append('email', formData.owner_email || formData.gym_email);
    payload.append('gym_email', formData.gym_email);
    payload.append('website', formData.website);
    payload.append('instagram_page', formData.instagram_page);
    payload.append('address', formData.address);
    payload.append('owner_name', formData.owner_name);
    payload.append('phone', formData.phone);
    payload.append('owner_email', formData.owner_email);
    payload.append('password', formData.password);
    gymPhotos.forEach((photo, index) => {
      payload.append(`gym_photos[${index}]`, photo);
    });

    const { error, authenticated } = await signUp(payload);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Sign up failed');
    } else {
      toast.success(
        authenticated
          ? 'Account created! Welcome to GymOs.'
          : 'Account created! Please sign in to continue.'
      );
      navigate(authenticated ? '/' : '/login');
    }
  };


  useEffect(() => {
    if (!user) navigate("/")

  }, [])

  return (
    <div className="relative min-h-screen flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-4">
        <ThemeToggle className="pointer-events-auto" />
      </div>

      {/* Left Panel */}
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
            Set up your gym management system in just a few steps and start managing your members today.
          </p>

          {/* Step indicators on left */}
          <div className="mt-12 space-y-4">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 transition-all',
                  step === s.id ? 'border border-white/20 bg-white/10 backdrop-blur-sm' : 'opacity-55'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                    step > s.id
                      ? 'border-primary bg-primary'
                      : step === s.id
                        ? 'border-primary bg-primary/15'
                        : 'border-white/20'
                  )}
                >
                  {step > s.id ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <s.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{s.title}</p>
                  <p className="text-sm text-white/60">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/85 p-8 shadow-elevated backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
              <Dumbbell className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">GymOs</h1>
          </div>

          {/* Mobile step progress */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  step >= s.id ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Step {step} of 3</p>
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
                  <Label htmlFor="business_registration_name">Business Registration Name *</Label>
                  <Input
                    id="business_registration_name"
                    value={formData.business_registration_name}
                    onChange={e => update('business_registration_name', e.target.value)}
                    placeholder="Registered business name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gym_email">Gym Email Address *</Label>
                  <Input
                    id="gym_email"
                    type="email"
                    value={formData.gym_email}
                    onChange={e => update('gym_email', e.target.value)}
                    placeholder="contact@yourgym.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={e => update('website', e.target.value)}
                    placeholder="https://yourgym.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instagram_page">Instagram Page</Label>
                  <Input
                    id="instagram_page"
                    value={formData.instagram_page}
                    onChange={e => update('instagram_page', e.target.value)}
                    placeholder="https://instagram.com/yourgym"
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
                <div className="space-y-1.5">
                  <Label htmlFor="owner_email">Owner Email Address *</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email}
                    onChange={e => update('owner_email', e.target.value)}
                    placeholder="owner@yourgym.com"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Gym Full Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={e => update('address', e.target.value)}
                    placeholder="Full gym address"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Account & Photos */}
            {step === 3 && (
              <div className="space-y-5">
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
                <div className="space-y-1.5">
                  <Label>
                    Gym Photographs *
                    <span className="text-muted-foreground font-normal ml-1">
                      ({gymPhotos.length}/{MAX_PHOTOS} uploaded, min {MIN_PHOTOS})
                    </span>
                  </Label>
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                    <div className="flex flex-col gap-3">
                      {/* Photo grid */}
                      {gymPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {gymPhotos.map((photo, index) => (
                            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-background">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
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

                      {/* Empty state */}
                      {gymPhotos.length === 0 && (
                        <label htmlFor="gym_photo" className="flex flex-col items-center justify-center py-6 cursor-pointer">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Upload gym photographs</p>
                          <p className="text-xs text-muted-foreground mt-1">Upload {MIN_PHOTOS}-{MAX_PHOTOS} photos, max 10 MB each</p>
                        </label>
                      )}

                      <Input
                        id="gym_photo"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </div>
                  </div>
                  {gymPhotos.length > 0 && gymPhotos.length < MIN_PHOTOS && (
                    <p className="mt-1 text-xs text-warning">
                      Please upload at least {MIN_PHOTOS - gymPhotos.length} more photo{MIN_PHOTOS - gymPhotos.length > 1 ? 's' : ''}
                    </p>
                  )}
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
                variant="gradient"
                className="flex-1 h-11"
                disabled={loading}
              >
                {step === 3 ? (loading ? 'Creating account...' : 'Create Account') : 'Continue'}
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
