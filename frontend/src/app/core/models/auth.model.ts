import { Rol } from '../enums';

/** ESQUEMA_API.md §2.1 */
export interface JwtResponse {
  token: string;
  expiresIn: number;
  username: string;
  roles: Rol[] | string[];
  fullName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

/** ESQUEMA_API.md §2.2 */
export interface UsuarioActual {
  username: string;
  fullName: string;
  roles: Rol[] | string[];
  lastLoginAt?: string | null;
}

/** ESQUEMA_API.md §2.3 */
export interface CambiarPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Claims del JWT — ARQUITECTURA.md §5.1 */
export interface JwtPayload {
  sub: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

/** Sesión persistida en localStorage */
export interface Sesion {
  token: string;
  username: string;
  fullName?: string;
  roles: Rol[];
  /** epoch ms */
  expiraEn: number;
}