import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { StaffForm, createEmptyStaffForm, type StaffFormValue } from "@/components/staff/StaffForm";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CreateStaffPage() {
  const { gyms, selectedGymId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffFormValue>(createEmptyStaffForm(selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""),
    }));
  }, [gyms, selectedGymId]);

  const handleSave = async (values: StaffFormValue) => {
    setSaving(true);
    try {
      await api.createStaff({
        gym_id: values.gym_id,
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        phone: values.phone || null,
        role: values.role.trim(),
        specializations: values.specializations || null,
        external_user_code: values.external_user_code || null,
        compensation_type: values.compensation_type,
        base_salary: Number(values.base_salary || 0),
        per_session_rate: Number(values.per_session_rate || 0),
        commission_percent: Number(values.commission_percent || 0),
        section_permissions: values.permissions,
      });
      toast.success("Staff member created");
      setForm(createEmptyStaffForm(selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""));
    } catch (error: any) {
      toast.error(error.message || "Failed to create staff member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Create Staff">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Create Staff</h1>
          <p className="mt-1 text-muted-foreground">Create any staff account and tag it with a custom designation such as trainer, desk manager, or peon.</p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <StaffForm gyms={gyms} value={form} onSubmit={handleSave} saving={saving} submitLabel="Create Staff Member" />
        </div>
      </div>
    </AppLayout>
  );
}
