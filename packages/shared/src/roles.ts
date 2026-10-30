export const ROLES = [
  "employee",
  "dispatcher",
  "contractor",
  "admin",
  "manager",
] as const;

export type Role = (typeof ROLES)[number];

export type Permission =
  | "requests:create"
  | "requests:read_own"
  | "requests:read_all"
  | "requests:read_assigned"
  | "requests:assign"
  | "requests:change_status"
  | "requests:confirm_completion"
  | "users:manage"
  | "reports:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  employee: ["requests:create", "requests:read_own", "requests:confirm_completion"],
  dispatcher: [
    "requests:create",
    "requests:read_own",
    "requests:read_all",
    "requests:assign",
    "requests:change_status",
    "requests:confirm_completion",
    "reports:read",
  ],
  contractor: ["requests:read_assigned", "requests:change_status"],
  admin: [
    "requests:create",
    "requests:read_own",
    "requests:read_all",
    "requests:assign",
    "requests:change_status",
    "requests:confirm_completion",
    "users:manage",
    "reports:read",
  ],
  manager: [
    "requests:create",
    "requests:read_own",
    "requests:read_all",
    "requests:confirm_completion",
    "reports:read",
  ],
};

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function hasAnyRole(roles: Role[], allowed: Role[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
