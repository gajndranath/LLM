export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'ANALYST' | 'VIEWER';
export type OrgPlan = 'free' | 'pro' | 'mega';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  otp: string;
  role?: UserRole;
}

export interface RegisterOrgInput {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
  plan: OrgPlan;
  otp: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId?: string;
    organizationName?: string;
  };
  accessToken: string;
  refreshToken: string;
}

