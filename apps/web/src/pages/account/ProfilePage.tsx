import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_SIZE_BYTES } from "@/utils/constants";
import {
  Building2,
  CalendarDays,
  Camera,
  Globe,
  AtSign,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

function getInitial(value: string | null | undefined) {
  return (value || "A")[0].toUpperCase();
}

function toDisplayLink(value: string | null | undefined) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatJoinedDate(value: string | null | undefined) {
  if (!value) return "Recently joined";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently joined";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const { admin, selectedGym, selectedGymId, refreshAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    owner_name: "",
    owner_email: "",
    phone: "",
  });

  useEffect(() => {
    if (!admin || !selectedGym) return;
    setForm({
      owner_name: selectedGym.owner_name || "",
      owner_email: selectedGym.owner_email || "",
      phone: selectedGym.phone || "",
    });
  }, [admin, selectedGym]);

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl(selectedGym?.logo_url || null);
      return;
    }

    const objectUrl = URL.createObjectURL(profileImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [profileImage, selectedGym?.logo_url]);

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

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
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
    if (selectedGym) {
      payload.append("gym_id", selectedGym.id);
    }
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

  const gymCount = admin?.gyms?.length ?? 0;
  const isBranchAccount = gymCount > 1 || admin?.gym_type === "branch";
  const joinedLabel = formatJoinedDate(selectedGym?.created_at || admin?.created_at);
  const profileLinks = [
    {
      label: form.owner_email || "Add owner email",
      href: form.owner_email ? `mailto:${form.owner_email}` : null,
      icon: Mail,
      muted: !form.owner_email,
    },
    {
      label: form.phone || "Add phone number",
      href: form.phone ? `tel:${form.phone}` : null,
      icon: Phone,
      muted: !form.phone,
    },
    {
      label: selectedGym?.website || "Add website",
      href: toDisplayLink(selectedGym?.website),
      icon: Globe,
      muted: !selectedGym?.website,
    },
    {
      label: selectedGym?.instagram_page || "Add Instagram",
      href: toDisplayLink(selectedGym?.instagram_page),
      icon: AtSign,
      muted: !selectedGym?.instagram_page,
    },
  ];
  const profileStrengthItems = [
    Boolean(form.owner_name.trim()),
    Boolean(form.owner_email.trim()),
    Boolean(form.phone.trim()),
    Boolean(selectedGym?.website),
    Boolean(selectedGym?.address),
    Boolean(previewUrl),
  ];
  const profileStrength = Math.round((profileStrengthItems.filter(Boolean).length / profileStrengthItems.length) * 100);
  const coverImage = selectedGym?.gym_photo_url || selectedGym?.gym_photo_urls?.[0] || null;

  return (
    <AppLayout title="Profile">
      {(admin?.gyms || []).length > 1 && selectedGymId === "all" ? (
        <div className="mx-auto max-w-3xl rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
          Select a specific gym from the global filter to edit its owner profile.
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="overflow-hidden border-border/60 xl:col-span-2">
            <div className="relative h-36 overflow-hidden sm:h-48">
              {coverImage ? (
                <img src={coverImage} alt={selectedGym?.gym_name || "Gym cover"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.45),_transparent_45%),linear-gradient(135deg,hsl(var(--primary)/0.24),hsl(var(--accent)/0.18),hsl(var(--background)))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            </div>
            <CardContent className="relative px-5 pb-6 pt-0 sm:px-8">
              <div className="flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <Avatar className="-mt-12 h-24 w-24 border-4 border-background shadow-xl sm:mt-0 sm:h-32 sm:w-32">
                    <AvatarImage src={previewUrl || undefined} alt={form.owner_name || "Admin"} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-3xl font-semibold text-primary">
                      {getInitial(form.owner_name || admin?.owner_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{form.owner_name || "Admin Profile"}</h1>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {isBranchAccount ? "Branch Network" : "Single Gym"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground sm:text-base">
                        Leads {selectedGym?.gym_name || admin?.gym_name || "GymOS"}
                        {selectedGym?.business_registration_name ? ` · ${selectedGym.business_registration_name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
                      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Account owner
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {gymCount} {gymCount === 1 ? "gym" : "gyms"}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        Joined {joinedLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Input id="profile_image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <Label
                    htmlFor="profile_image"
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Camera className="h-4 w-4" />
                    {profileImage ? "Change selected photo" : "Upload new photo"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {profileImage ? `${profileImage.name} ready to save` : "Upload a square image for the cleanest avatar crop."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
                  <p className="text-sm font-medium text-foreground">Profile Summary</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Manage the identity shown across GymOS for your selected gym. Your profile photo appears in the header menu,
                    and these contact details help your team keep owner information current.
                  </p>
                  {selectedGym?.address ? (
                    <div className="mt-4 inline-flex items-start gap-2 rounded-xl bg-background px-3 py-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{selectedGym.address}</span>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {profileLinks.map((item) => {
                    const Icon = item.icon;
                    const content = (
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm transition-colors",
                          item.href ? "hover:border-primary/40 hover:bg-primary/5" : "text-muted-foreground",
                        )}
                      >
                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn("truncate font-medium text-foreground", item.muted && "text-muted-foreground")}>{item.label}</p>
                        </div>
                      </div>
                    );

                    return item.href ? (
                      <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                        {content}
                      </a>
                    ) : (
                      <div key={item.label}>{content}</div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Edit Profile</CardTitle>
              <CardDescription>Refine the owner details tied to the selected gym.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-4">
                  <div className="space-y-1.5">
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
                    <p>Photo previews update instantly here. Save the profile to publish the new avatar in the header menu and account surfaces.</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Profile Strength</CardTitle>
              <CardDescription>A complete profile is easier for staff to recognize and maintain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Completion</span>
                  <span className="text-muted-foreground">{profileStrength}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${profileStrength}%` }} />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Best next step</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {!previewUrl
                      ? "Add a profile photo so the account is immediately recognizable across the app."
                      : !form.owner_email
                        ? "Add the owner email to make the profile feel more complete and easier to contact."
                        : !selectedGym?.website
                          ? "Add a website in gym settings to round out the public-facing profile snapshot."
                          : "Your profile is in good shape. Keep it updated when contact details change."}
                  </p>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Account scope</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You are editing the owner profile for <span className="font-medium text-foreground">{selectedGym?.gym_name || admin?.gym_name || "this gym"}</span>.
                    If you manage multiple branches, switch the global gym filter to update another location.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
