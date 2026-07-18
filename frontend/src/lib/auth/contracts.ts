export const USER_ROLES = ["merchant", "ops_staff", "rm", "compliance", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  merchant_id: string | null;
}

export interface SessionResponse {
  user: SessionUser;
  csrfToken: string;
}

export function isOperationsRole(role: UserRole): boolean {
  return role !== "merchant";
}
