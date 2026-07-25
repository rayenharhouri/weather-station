import { UserRole } from '../entities/user.entity';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
  expiresIn: number;
}
