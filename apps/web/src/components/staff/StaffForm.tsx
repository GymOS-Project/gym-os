import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const STAFF_PERMISSION_OPTIONS = [
  "members",
  "packages",
  "diet_plans",
  "exercise_plans",
  "enquiries",
  "followups",
  "reports",
] as const;

export type StaffFormValue = {
  gym_id: string;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  specializations: string;
  is_active: boolean;
  permissions: Set<string>;
};

type Props = {
  gyms: Gym[];
  value: StaffFormValue;
  onChange: (value: StaffFormValue) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  saving?: boolean;
  editing?: boolean;
  submitLabel: string;
};

export function createEmptyStaffForm(gymId = ""): StaffFormValue {
  return {
    gym_id: gymId,
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
    specializations: "",
    is_active: true,
    permissions: new Set<string>(["members", "diet_plans", "exercise_plans"]),
  };
}

export function StaffForm({ gyms, value, onChange, onSubmit, onCancel, saving, editing, submitLabel }: Props) {
  const setField = <K extends keyof StaffFormValue>(key: K, nextValue: StaffFormValue[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const togglePermission = (permission: string, checked: boolean) => {
    const permissions = new Set(value.permissions);
    if (checked) permissions.add(permission);
    else permissions.delete(permission);
    onChange({ ...value, permissions });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Gym</Label>
          <Select value={value.gym_id} onValueChange={(nextValue) => setField("gym_id", nextValue)}>
            <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
            <SelectContent>
              {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={value.full_name} onChange={(e) => setField("full_name", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={value.email} disabled={editing} onChange={(e) => setField("email", e.target.value)} />
        </div>

        {!editing && (
          <div className="space-y-1.5">
            <Label>Temporary Password</Label>
            <Input type="password" value={value.password} onChange={(e) => setField("password", e.target.value)} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={value.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Designation / Role Tag</Label>
          <Input value={value.role} onChange={(e) => setField("role", e.target.value)} placeholder="e.g. Trainer, Desk Manager, Peon" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notes / Specialty</Label>
          <Textarea value={value.specializations} onChange={(e) => setField("specializations", e.target.value)} placeholder="Optional notes, speciality, responsibility, etc." />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Permissions</Label>
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 xl:grid-cols-3">
            {STAFF_PERMISSION_OPTIONS.map((permission) => (
              <label key={permission} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm capitalize">
                <span>{permission.replace(/_/g, " ")}</span>
                <Switch checked={value.permissions.has(permission)} onCheckedChange={(checked) => togglePermission(permission, checked)} />
              </label>
            ))}
          </div>
        </div>

        {editing && (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
            <div>
              <p className="font-medium">Active account</p>
              <p className="text-sm text-muted-foreground">Inactive staff members cannot log in.</p>
            </div>
            <Switch checked={value.is_active} onCheckedChange={(checked) => setField("is_active", checked)} />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
        <Button type="button" variant="gradient" onClick={onSubmit} disabled={saving}>{saving ? "Saving..." : submitLabel}</Button>
      </div>
    </div>
  );
}
