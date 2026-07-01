import { AccountStatus, AdminRole, UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
  adminRole: AdminRole | null;
  accountStatus: AccountStatus;
  phoneVerified: boolean;
}

