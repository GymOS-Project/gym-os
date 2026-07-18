import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ImageUp, Settings } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function SettingsPage() {
  const { admin, refreshAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gymPhoto, setGymPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    gym_name: "",
    business_registration_name: "",
    email: "",
    website: "",
    instagram_page: "",
    address: "",
  });

  useEffect(() => {
    if (!admin) return;
    setForm({
      gym_name: admin.gym_name || "",
      business_registration_name: admin.business_registration_name || "",
      email: admin.email || "",
      website: admin.website || "",
      instagram_page: admin.instagram_page || "",
      address: admin.address || "",
    });
  }, [admin]);

  useEffect(() => {
    if (!gymPhoto) {
      setPreviewUrl(admin?.gym_photo_url || null);
      return;
    }

    const objectUrl = URL.createObjectURL(gymPhoto);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [gymPhoto, admin?.gym_photo_url]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Gym image must be smaller than 10 MB");
      return;
    }

    setGymPhoto(file);
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
    payload.append("gym_name", form.gym_name);
    payload.append("business_registration_name", form.business_registration_name);
    payload.append("email", form.email);
    payload.append("website", form.website);
    payload.append("instagram_page", form.instagram_page);
    payload.append("address", form.address);
    if (gymPhoto) {
      payload.append("gym_photo", gymPhoto);
    }

    try {
      await api.updateAdmin(payload);
      await refreshAdmin();
      setGymPhoto(null);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Settings">
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
              <CardTitle className="text-xl">Gym Image</CardTitle>
              <CardDescription>Update the image used for your gym profile.</CardDescription>
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
              <div className="space-y-1.5">
                <Label htmlFor="gym_photo">Cover Image</Label>
                <Input id="gym_photo" type="file" accept="image/*" onChange={handleImageChange} />
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
    </AppLayout>
  );
}
