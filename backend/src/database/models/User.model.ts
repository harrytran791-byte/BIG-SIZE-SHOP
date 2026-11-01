export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
}
