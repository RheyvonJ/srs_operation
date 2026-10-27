export type UserRole = 'Store Manager' | 'Head Cashier' | 'Inventory Auditor' | 'System Admin';

export interface DemoAccount {
  role: UserRole;
  username: string;
  name: string;
  branch: string;
  terminalId: string;
  badgeText: string;
}

export interface BranchOption {
  id: string;
  name: string;
  city: string;
  code: string;
}
