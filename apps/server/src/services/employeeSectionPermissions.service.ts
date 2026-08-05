import { supabase } from "../supabase";

export const ADMIN_SECTIONS = [
  'members', 'packages', 'enquiries', 'followups',
  'transactions', 'reviews', 'reports', 'settings',
  'classes', 'pt', 'attendance', 'activity_logs', 'payroll', 'integrations',
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number];

export function isAdminSectionKey(key: string): key is AdminSectionKey {
  return ADMIN_SECTIONS.includes(key as AdminSectionKey);
}

export async function canEmployeeEditSection(
  employeeId: string,
  section: AdminSectionKey
): Promise<boolean> {
  const { data, error } = await supabase
    .from("staff_accounts")
    .select("section_permissions, is_active")
    .or(`id.eq.${employeeId},auth_user_id.eq.${employeeId}`)
    .maybeSingle();

  if (error || !data || data.is_active === false) {
    return false;
  }

  return Array.isArray(data.section_permissions) && data.section_permissions.includes(section);
}
