import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ImageUp, ImagePlus, Settings, X } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_GYM_PHOTOS = 10;

export default function SettingsPage() {
  const { admin, selectedGym, selectedGymId, refreshAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gymPhotos, setGymPhotos] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    gym_type: "single" as "single" | "branch",
    gym_name: "",
    business_registration_name: "",
    email: "",
    website: "",
    instagram_page: "",
    address: "",
  });

  useEffect(() => {
    if (!admin || !selectedGym) return;
    setForm({
      gym_type: selectedGym.gym_type || "single",
      gym_name: selectedGym.gym_name || "",
      business_registration_name: selectedGym.business_registration_name || "",
      email: selectedGym.email || "",
      website: selectedGym.website || "",
      instagram_page: selectedGym.instagram_page || "",
      address: selectedGym.address || "",
    });
  }, [admin, selectedGym]);

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
    if (!admin) return;

    if (!form.gym_name.trim()) {
      toast.error("Gym name is required");
      return;
    }

    setSaving(true);

    const payload = new FormData();
    if (selectedGym) {
      payload.append("gym_id", selectedGym.id);
    }
    payload.append("gym_type", form.gym_type);
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

  return (
    <AppLayout title="Settings">
      {admin?.gyms?.length > 1 && selectedGymId === "all" ? (
        <div className="mx-auto max-w-3xl rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
          Select a specific gym from the global filter to edit branch settings.
        </div>
      ) : (
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Gym Settings</CardTitle>
            <CardDescription>Manage your gym details, public links, and business information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gym_type">Gym Type</Label>
                  <Select value={form.gym_type} onValueChange={(value: "single" | "branch") => updateField("gym_type", value)}>
                    <SelectTrigger id="gym_type">
                      <SelectValue placeholder="Select gym type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gym_name">Gym Name</Label>
                  <Input
                    id="gym_name"
                    value={form.gym_name}
                    onChange={(event) => updateField("gym_name", event.target.value)}
                    placeholder="Your gym name"
                    required
                  />
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
                  <Input
                    id="gym_email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="contact@yourgym.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(event) => updateField("website", event.target.value)}
                    placeholder="https://yourgym.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="instagram_page">Instagram Page</Label>
                  <Input
                    id="instagram_page"
                    value={form.instagram_page}
                    onChange={(event) => updateField("instagram_page", event.target.value)}
                    placeholder="https://instagram.com/yourgym"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder="Full gym address"
                    className="min-h-[120px]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="gradient" disabled={saving || !admin} className="gap-2">
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
      )}
    </AppLayout>
  );
}
