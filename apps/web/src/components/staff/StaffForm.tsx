import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { STAFF_PERMISSION_OPTIONS } from "@/utils/constants";

function optionalNumberString(label: string) {
  return z
    .string()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      { message: `${label} must be 0 or more` }
    );
}

function createSchema(editing?: boolean) {
  return z.object({
    gym_id: z.string().min(1, "Gym is required"),
    full_name: z.string().trim().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    password: editing
      ? z.string()
      : z.string().min(6, "Temporary password must be at least 6 characters"),
    phone: z.string(),
    role: z.string().trim().min(1, "Role is required"),
    specializations: z.string(),
    external_user_code: z.string(),
    compensation_type: z.enum(["fixed", "per_session", "commission"]),
    base_salary: optionalNumberString("Base salary"),
    per_session_rate: optionalNumberString("Per session rate"),
    commission_percent: optionalNumberString("Commission %"),
    is_active: z.boolean(),
    permissions: z
      .array(z.enum(STAFF_PERMISSION_OPTIONS)),
  });
}

export function createEmptyStaffForm(gymId = ""): StaffFormValue {
  return {
    gym_id: gymId,
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
    specializations: "",
    external_user_code: "",
    compensation_type: "fixed",
    base_salary: "",
    per_session_rate: "",
    commission_percent: "",
    is_active: true,
    permissions: ["members", "diet_plans", "exercise_plans"],
  };
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

export function StaffForm({
  gyms,
  value,
  onSubmit,
  onCancel,
  saving,
  editing,
  submitLabel,
}: StaffFormProps) {
  const schema = useMemo(() => createSchema(editing), [editing]);
  const methods = useForm<StaffFormValue>({
    resolver: zodResolver(schema),
    defaultValues: value,
  });

  const permissions = methods.watch("permissions");

  useEffect(() => {
    methods.reset(value);
  }, [methods, value]);

  // Toggle permissions (enforce strong typing)
  const togglePermission = (permission: StaffPermission, checked: boolean) => {
    const nextPermissions = checked
      ? Array.from(new Set([...permissions, permission]))
      : permissions.filter((item) => item !== permission);

    methods.setValue("permissions", nextPermissions, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = async (formValue: StaffFormValue) => {
    await onSubmit({
      ...formValue,
      full_name: formValue.full_name.trim(),
      email: formValue.email.trim(),
      phone: formValue.phone.trim(),
      role: formValue.role.trim(),
      specializations: formValue.specializations.trim(),
      external_user_code: formValue.external_user_code.trim(),
    });
  };

  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={methods.control}
            name="gym_id"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Gym <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gym" />
                    </SelectTrigger>
                    <SelectContent>
                      {gyms.map((gym) => (
                        <SelectItem key={gym.id} value={gym.id}>
                          {gym.gym_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full Name <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input {...field} type="email" disabled={editing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!editing && (
            <FormField
              control={methods.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Temporary Password <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={methods.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Designation / Role Tag <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Trainer, Desk Manager, Peon" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="specializations"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Notes / Specialty</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Optional notes, speciality, responsibility, etc."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="external_user_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attendance / Device Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Optional eSSL user code"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="compensation_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compensation Type</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Salary</SelectItem>
                      <SelectItem value="per_session">Per Session</SelectItem>
                      <SelectItem value="commission">Commission Driven</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="base_salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Salary</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="per_session_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Per Session Rate</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="commission_percent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission %</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={methods.control}
            name="permissions"
            render={() => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Permissions</FormLabel>
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {STAFF_PERMISSION_OPTIONS.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm capitalize"
                    >
                      <span>{permission.replace(/_/g, " ")}</span>
                      <Switch
                        checked={permissions.includes(permission)}
                        onCheckedChange={(checked) =>
                          togglePermission(permission, checked)
                        }
                      />
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {editing && (
            <FormField
              control={methods.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <FormLabel>Active account</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive staff members cannot log in.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex gap-3">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
