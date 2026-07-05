export const ADMIN_SECTIONS = [
  'members', 'packages', 'enquiries', 'followups',
  'transactions', 'reviews', 'reports', 'settings',
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number];

export function isAdminSectionKey(key: string): key is AdminSectionKey {
  return ADMIN_SECTIONS.includes(key as AdminSectionKey);
}

export async function canEmployeeEditSection(
  _employeeId: string,
  _section: AdminSectionKey
): Promise<boolean> {
  return false;
}
