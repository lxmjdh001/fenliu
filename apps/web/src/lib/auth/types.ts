export type UserRole = "admin" | "member";
export type MembershipLevel = "free" | "vip";
export type UserStatus = "active" | "banned";

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  membershipLevel: MembershipLevel;
  membershipExpiresAt: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  membershipLevel: MembershipLevel;
  membershipExpiresAt: string;
  status: UserStatus;
}

export interface SessionRecord {
  token: string;
  userId: number;
  createdAt: string;
  expiresAt: string;
}
