export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'ANALYST' | 'VIEWER';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  otp: string;
  role?: UserRole;
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
  };
  accessToken: string;
  refreshToken: string;
}
