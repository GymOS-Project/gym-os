import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, GitBranch, Globe, ImagePlus, ImageUp, Lock, Plus, Settings, X } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_GYM_PHOTOS = 10;

type BranchForm = {
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

type PaymentForm = {
  card_name: string;
  card_number: string;
  expiry: string;
  cvv: string;
};

const EMPTY_BRANCH_FORM: BranchForm = {
  gym_name: "",
  business_registration_name: "",
  gym_email: "",
  website: "",
  instagram_page: "",
  address: "",
  owner_name: "",
  phone: "",
  owner_email: "",
};

const EMPTY_PAYMENT_FORM: PaymentForm = {
  card_name: "",
  card_number: "",
  expiry: "",
  cvv: "",
};

export default function SettingsPage() {
  const { admin, selectedGym, selectedGymId, refreshAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [gymPhotos, setGymPhotos] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [branchForm, setBranchForm] = useState<BranchForm>(EMPTY_BRANCH_FORM);
  const [form, setForm] = useState({
    gym_name: "",
    business_registration_name: "",
    email: "",
    website: "",
    instagram_page: "",
    address: "",
  });

  const isSingleGymAccount = (admin?.gyms?.length || 0) === 1 && admin?.gym_type === "single";
  const isBranchAccount = (admin?.gyms?.length || 0) > 1 || admin?.gym_type === "branch";
  const canEditSelectedGym = Boolean(selectedGym);

  useEffect(() => {
    if (!selectedGym) {
      return;
    }

    setForm({
      gym_name: selectedGym.gym_name || "",
      business_registration_name: selectedGym.business_registration_name || "",
      email: selectedGym.email || "",
      website: selectedGym.website || "",
      instagram_page: selectedGym.instagram_page || "",
      address: selectedGym.address || "",
    });
  }, [selectedGym]);

  useEffect(() => {
    if (gymPhotos.length === 0) {
      setPreviewUrl(selectedGym?.gym_photo_url || null);
      setGalleryPreviewUrls(selectedGym?.gym_photo_urls || []);
      return;
    }

    const objectUrls = gymPhotos.map((photo) => URL.createObjectURL(photo));
    setPreviewUrl(objectUrls[0] || null);
    setGalleryPreviewUrls(objectUrls);

    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [gymPhotos, selectedGym?.gym_photo_url, selectedGym?.gym_photo_urls]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateBranchField = (field: keyof BranchForm, value: string) => {
    setBranchForm((current) => ({ ...current, [field]: value }));
  };

  const updatePaymentField = (field: keyof PaymentForm, value: string) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const resetUpgradeForms = () => {
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setBranchForm(EMPTY_BRANCH_FORM);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.some((file) => !file.type.startsWith("image/"))) {
      toast.error("Please upload only image files");
      return;
    }

    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      toast.error("Each gym image must be smaller than 10 MB");
      return;
    }

    if (files.length > MAX_GYM_PHOTOS) {
      toast.error(`You can upload up to ${MAX_GYM_PHOTOS} gym photos`);
      return;
    }

    setGymPhotos(files.slice(0, MAX_GYM_PHOTOS));
  };

  const removeGymPhoto = (index: number) => {
    setGymPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!admin || !selectedGym) return;

    if (!form.gym_name.trim()) {
      toast.error("Gym name is required");
      return;
    }

    setSaving(true);

    const payload = new FormData();
    payload.append("gym_id", selectedGym.id);
    payload.append("gym_name", form.gym_name);
    payload.append("business_registration_name", form.business_registration_name);
    payload.append("email", form.email);
    payload.append("website", form.website);
    payload.append("instagram_page", form.instagram_page);
    payload.append("address", form.address);
    gymPhotos.forEach((photo, index) => {
      payload.append(`gym_photos[${index}]`, photo);
    });

    try {
      await api.updateAdmin(payload);
      await refreshAdmin();
      setGymPhotos([]);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const validateBranchForm = () => {
    if (!branchForm.gym_name.trim()) return "Gym name is required";
    if (!branchForm.business_registration_name.trim()) return "Business registration name is required";
    if (!branchForm.gym_email.trim()) return "Gym email is required";
    if (!branchForm.owner_name.trim()) return "Owner name is required";
    if (!branchForm.phone.trim()) return "Phone number is required";
    if (!branchForm.owner_email.trim()) return "Owner email is required";
    if (!branchForm.address.trim()) return "Address is required";
    return null;
  };

  const handleDemoPayment = (event: React.FormEvent) => {
    event.preventDefault();

    if (!paymentForm.card_name.trim() || !paymentForm.card_number.trim() || !paymentForm.expiry.trim() || !paymentForm.cvv.trim()) {
      toast.error("Fill all payment details to continue");
      return;
    }

    setPaymentOpen(false);
    setBranchDialogOpen(true);
    toast.success("Demo payment completed. Add your new branch details.");
  };

  const handleBranchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationMessage = validateBranchForm();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setBranchSaving(true);

    try {
      if (isSingleGymAccount) {
        await api.upgradeToBranch(branchForm);
        toast.success("Your account has been upgraded to branch mode");
      } else {
        await api.createBranch(branchForm);
        toast.success("New branch added successfully");
      }

      await refreshAdmin();
      setBranchDialogOpen(false);
      resetUpgradeForms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save branch");
    } finally {
      setBranchSaving(false);
    }
  };

  const openUpgradeFlow = () => {
    resetUpgradeForms();
    setPaymentOpen(true);
  };

  const openAddBranchDialog = () => {
    setBranchForm(EMPTY_BRANCH_FORM);
    setBranchDialogOpen(true);
  };

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">Gym Network</CardTitle>
                <CardDescription>
                  Upgrade single-gym accounts to branch mode, then keep adding new gyms under the same admin account.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                {admin?.gyms?.length || 0} gym{(admin?.gyms?.length || 0) === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Gym type is controlled by the upgrade flow.</p>
                  <p>
                    You can still edit gym details normally, but switching from single to branch happens only through the in-app upgrade action.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Managed Gyms
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(admin?.gyms || []).map((gym, index) => (
                    <div key={gym.id} className="rounded-xl border bg-muted/20 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{gym.gym_name}</p>
                          <p className="text-xs text-muted-foreground">{gym.address || "Address not added"}</p>
                        </div>
                        <Badge variant={index === 0 ? "default" : "outline"}>{index === 0 ? "Primary" : "Branch"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-sm font-medium text-foreground">Plan Action</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isSingleGymAccount
                    ? "You currently manage one gym. Upgrade once, add your second gym, and the account becomes a branch network."
                    : "Your account is already in branch mode. Add more gyms whenever you need another location."}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {isSingleGymAccount ? (
                    <Button onClick={openUpgradeFlow} variant="gradient" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Upgrade To Branch Gym
                    </Button>
                  ) : (
                    <Button onClick={openAddBranchDialog} variant="gradient" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Branch
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isSingleGymAccount ? "Demo payment only. No real charge is processed in this flow." : "Every new branch becomes immediately available in forms and the global gym filter."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!canEditSelectedGym && admin?.gyms?.length > 1 ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
            Select a specific gym from the global filter to edit its settings and photos. Branch management remains available above.
          </div>
        ) : selectedGym ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Gym Settings</CardTitle>
                <CardDescription>Manage your gym details, public links, and business information.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Gym Type</Label>
                      <div className="flex min-h-10 items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                        <span className="capitalize">{selectedGym.gym_type} gym</span>
                        <span className="text-xs text-muted-foreground">
                          {(admin?.gyms?.length || 0) > 1 ? "Branch account" : "Single account"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gym_name">Gym Name</Label>
                      <Input id="gym_name" value={form.gym_name} onChange={(event) => updateField("gym_name", event.target.value)} placeholder="Your gym name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="business_registration_name">Business Registration Name</Label>
                      <Input
                        id="business_registration_name"
                        value={form.business_registration_name}
                        onChange={(event) => updateField("business_registration_name", event.target.value)}
                        placeholder="Registered business name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gym_email">Gym Email</Label>
                      <Input id="gym_email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="contact@yourgym.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" value={form.website} onChange={(event) => updateField("website", event.target.value)} placeholder="https://yourgym.com" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="instagram_page">Instagram Page</Label>
                      <Input id="instagram_page" value={form.instagram_page} onChange={(event) => updateField("instagram_page", event.target.value)} placeholder="https://instagram.com/yourgym" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea id="address" value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Full gym address" className="min-h-[120px]" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="gradient" disabled={saving} className="gap-2">
                      <Settings className="h-4 w-4" />
                      {saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Gym Photos</CardTitle>
                  <CardDescription>Upload up to 10 photos for this gym. The first photo is used as the cover image.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border bg-muted/20">
                    {previewUrl ? (
                      <img src={previewUrl} alt={form.gym_name || "Gym"} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                        <ImageUp className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {galleryPreviewUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border bg-background">
                        <img src={url} alt={`${form.gym_name || "Gym"} ${index + 1}`} className="h-full w-full object-cover" />
                        {gymPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => removeGymPhoto(index)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {galleryPreviewUrls.length < MAX_GYM_PHOTOS && (
                      <label
                        htmlFor="gym_photo"
                        className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center transition-colors hover:border-primary/50 hover:bg-primary/10"
                      >
                        <ImagePlus className="mb-2 h-6 w-6 text-primary" />
                        <span className="px-2 text-xs font-medium text-primary">Add Photos</span>
                      </label>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gym_photo">Gym Photo Gallery</Label>
                    <Input id="gym_photo" type="file" accept="image/*" multiple onChange={handleImageChange} />
                    <p className="text-xs text-muted-foreground">Selecting new files replaces the current gallery for this gym.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Visibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    <Globe className="mt-0.5 h-4 w-4 text-primary" />
                    <p>Keep your website, Instagram page, and gym image updated so your business details stay consistent across your admin records.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upgrade Plan</DialogTitle>
              <DialogDescription>
                Demo payment to unlock branch mode. After this step, you will add the details for your second gym.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDemoPayment} className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-medium text-foreground">Branch Gym Upgrade</p>
                <p className="mt-1 text-sm text-muted-foreground">Demo amount: ₹4,999</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card_name">Cardholder Name</Label>
                <Input id="card_name" value={paymentForm.card_name} onChange={(event) => updatePaymentField("card_name", event.target.value)} placeholder="Owner name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card_number">Card Number</Label>
                <Input id="card_number" value={paymentForm.card_number} onChange={(event) => updatePaymentField("card_number", event.target.value)} placeholder="4111 1111 1111 1111" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" value={paymentForm.expiry} onChange={(event) => updatePaymentField("expiry", event.target.value)} placeholder="12/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" value={paymentForm.cvv} onChange={(event) => updatePaymentField("cvv", event.target.value)} placeholder="123" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                <Button type="submit" variant="gradient" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pay & Continue
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isSingleGymAccount ? "Add Your New Gym" : "Add Another Branch"}</DialogTitle>
              <DialogDescription>
                {isSingleGymAccount
                  ? "This second gym will convert the account into branch mode automatically."
                  : "Add another managed gym under your branch account."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Gym Name *</Label>
                  <Input value={branchForm.gym_name} onChange={(event) => updateBranchField("gym_name", event.target.value)} placeholder="New gym name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Business Registration Name *</Label>
                  <Input value={branchForm.business_registration_name} onChange={(event) => updateBranchField("business_registration_name", event.target.value)} placeholder="Registered business name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gym Email *</Label>
                  <Input type="email" value={branchForm.gym_email} onChange={(event) => updateBranchField("gym_email", event.target.value)} placeholder="contact@yourgym.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={branchForm.website} onChange={(event) => updateBranchField("website", event.target.value)} placeholder="https://yourgym.com" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Instagram Page</Label>
                  <Input value={branchForm.instagram_page} onChange={(event) => updateBranchField("instagram_page", event.target.value)} placeholder="https://instagram.com/yourgym" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Name *</Label>
                  <Input value={branchForm.owner_name} onChange={(event) => updateBranchField("owner_name", event.target.value)} placeholder="Owner name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number *</Label>
                  <Input value={branchForm.phone} onChange={(event) => updateBranchField("phone", event.target.value)} placeholder="+91 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Email *</Label>
                  <Input type="email" value={branchForm.owner_email} onChange={(event) => updateBranchField("owner_email", event.target.value)} placeholder="owner@yourgym.com" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address *</Label>
                  <Textarea value={branchForm.address} onChange={(event) => updateBranchField("address", event.target.value)} placeholder="Full gym address" className="min-h-[110px]" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="gradient" disabled={branchSaving} className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  {branchSaving ? "Saving..." : isSingleGymAccount ? "Finish Upgrade" : "Add Branch"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
