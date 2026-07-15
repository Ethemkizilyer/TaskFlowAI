export type Role = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'PERSONNEL';

export type Permission =
  | 'system:manage'
  | 'users:manage'
  | 'users:approve'
  | 'users:ban'
  | 'users:role:change'
  | 'departments:manage'
  | 'departments:view'
  | 'teams:manage'
  | 'teams:view'
  | 'boards:create'
  | 'boards:delete:any'
  | 'boards:delete:own'
  | 'tasks:assign'
  | 'tasks:delete:any'
  | 'tasks:delete:own'
  | 'messages:send'
  | 'messages:view'
  | 'analytics:view'
  | 'analytics:view:team'
  | 'analytics:view:department'
  | 'analytics:view:global'
  | 'activity:view:all'
  | 'activity:view:team'
  | 'activity:view:own';

const ALL_PERMISSIONS: Permission[] = [
  'system:manage',
  'users:manage',
  'users:approve',
  'users:ban',
  'users:role:change',
  'departments:manage',
  'departments:view',
  'teams:manage',
  'teams:view',
  'boards:create',
  'boards:delete:any',
  'boards:delete:own',
  'tasks:assign',
  'tasks:delete:any',
  'tasks:delete:own',
  'messages:send',
  'messages:view',
  'analytics:view',
  'analytics:view:team',
  'analytics:view:department',
  'analytics:view:global',
  'activity:view:all',
  'activity:view:team',
  'activity:view:own',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  DIRECTOR: [
    'users:manage',
    'users:approve',
    'users:ban',
    'users:role:change',
    'departments:manage',
    'departments:view',
    'teams:manage',
    'teams:view',
    'boards:create',
    'boards:delete:own',
    'tasks:assign',
    'tasks:delete:own',
    'messages:send',
    'messages:view',
    'analytics:view',
    'analytics:view:department',
    'analytics:view:global',
    'activity:view:all',
    'activity:view:team',
    'activity:view:own',
  ],
  MANAGER: [
    'departments:view',
    'teams:manage',
    'teams:view',
    'boards:create',
    'boards:delete:own',
    'tasks:assign',
    'tasks:delete:own',
    'messages:send',
    'messages:view',
    'analytics:view',
    'analytics:view:team',
    'activity:view:team',
    'activity:view:own',
  ],
  TEAM_LEADER: [
    'teams:view',
    'boards:create',
    'boards:delete:own',
    'tasks:assign',
    'tasks:delete:own',
    'messages:send',
    'messages:view',
    'analytics:view:team',
    'activity:view:team',
    'activity:view:own',
  ],
  TEAM_MEMBER: [
    'boards:create',
    'boards:delete:own',
    'tasks:assign',
    'tasks:delete:own',
    'messages:send',
    'messages:view',
    'activity:view:own',
  ],
  PERSONNEL: [
    'boards:create',
    'tasks:delete:own',
    'messages:send',
    'messages:view',
    'activity:view:own',
  ],
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 100,
  DIRECTOR: 80,
  MANAGER: 60,
  TEAM_LEADER: 40,
  TEAM_MEMBER: 20,
  PERSONNEL: 10,
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function isRoleAtLeast(role: string, minRole: Role): boolean {
  return ROLE_HIERARCHY[role as Role] >= ROLE_HIERARCHY[minRole];
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'System Administrator',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  TEAM_LEADER: 'Team Leader',
  TEAM_MEMBER: 'Team Member',
  PERSONNEL: 'Personnel',
};

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'red',
  DIRECTOR: 'purple',
  MANAGER: 'blue',
  TEAM_LEADER: 'green',
  TEAM_MEMBER: 'cyan',
  PERSONNEL: 'gray',
};
