import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, UserRound } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function ProfilePage() {
  const { admin, refreshAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    owner_name: "",
    owner_email: "",
    phone: "",
  });

  useEffect(() => {
    if (!admin) return;
    setForm({
      owner_name: admin.owner_name || "",
      owner_email: admin.owner_email || "",
      phone: admin.phone || "",
    });
  }, [admin]);

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl(admin?.logo_url || null);
      return;
    }

    const objectUrl = URL.createObjectURL(profileImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [profileImage, admin?.logo_url]);

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
      toast.error("Profile image must be smaller than 10 MB");
      return;
    }

    setProfileImage(file);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!admin) return;

    if (!form.owner_name.trim()) {
      toast.error("Owner name is required");
      return;
    }

    setSaving(true);

    const payload = new FormData();
    payload.append("owner_name", form.owner_name);
    payload.append("owner_email", form.owner_email);
    payload.append("phone", form.phone);
    if (profileImage) {
      payload.append("profile_image", profileImage);
    }

    try {
      await api.updateAdmin(payload);
      await refreshAdmin();
      setProfileImage(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Profile">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Admin Profile</CardTitle>
            <CardDescription>Update your account image and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Avatar className="h-28 w-28 border border-border shadow-sm">
                <AvatarImage src={previewUrl || undefined} alt={form.owner_name || "Admin"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                  {(form.owner_name || admin?.owner_name || "A")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{form.owner_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">{admin?.gym_name || "GymOs"}</p>
              </div>
              <div className="w-full space-y-1.5">
                <Label htmlFor="profile_image">Profile Image</Label>
                <Input id="profile_image" type="file" accept="image/*" onChange={handleImageChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Basic Details</CardTitle>
            <CardDescription>Keep your admin profile information up to date.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={form.owner_name}
                    onChange={(event) => updateField("owner_name", event.target.value)}
                    placeholder="Admin name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={form.owner_email}
                    onChange={(event) => updateField("owner_email", event.target.value)}
                    placeholder="owner@yourgym.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                  <p>Your profile image is also used in the admin header menu for quick account recognition.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="submit" variant="gradient" disabled={saving || !admin} className="gap-2">
                  <Camera className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
