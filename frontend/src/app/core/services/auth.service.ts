import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Rol } from '../enums';
import {
  CambiarPasswordRequest,
  JwtResponse,
  LoginRequest,
  Sesion,
  UsuarioActual,
} from '../models/auth.model';
import { CLAVE_SESION, CLAVE_TOKEN, expiracionDe } from '../utils/jwt.util';
import { API_BASE } from '../utils/api-base';

/**
 * Sesión del cliente: login, logout, expiración del JWT y roles.
 * Base: ARQUITECTURA.md §6.4
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sesionSignal = signal<Sesion | null>(this.leerSesion());

  /** Sesión actual, o `null` si no hay login válido. */
  readonly sesion = this.sesionSignal.asReadonly();

  readonly autenticado = computed(() => {
    const sesion = this.sesionSignal();
    return !!sesion && sesion.expiraEn > Date.now();
  });

  readonly token = computed(() => (this.autenticado() ? this.sesionSignal()?.token ?? null : null));

  readonly usuario = computed(() => this.sesionSignal()?.username ?? null);
  readonly nombreCompleto = computed(() => this.sesionSignal()?.fullName ?? null);
  readonly roles = computed<Rol[]>(() => this.sesionSignal()?.roles ?? []);
  readonly esAdmin = computed(() => this.tieneRol(Rol.ADMIN));

  /** `POST /api/auth/login` — persiste el token antes de emitir. */
  login(credenciales: LoginRequest): Observable<JwtResponse> {
    return this.http
      .post<JwtResponse>(`${API_BASE}/auth/login`, credenciales)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  /** `GET /api/auth/me` — refresca `fullName` y roles del servidor. */
  cargarPerfil(): Observable<UsuarioActual> {
    return this.http.get<UsuarioActual>(`${API_BASE}/auth/me`).pipe(
      tap((perfil) => this.actualizarPerfil(perfil)),
    );
  }

  /** `PUT /api/auth/password` — R-A-03. */
  cambiarPassword(request: CambiarPasswordRequest): Observable<void> {
    return this.http.put<void>(`${API_BASE}/auth/password`, request);
  }

  logout(redirigir = true): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_SESION);
    this.sesionSignal.set(null);
    if (redirigir) {
      void this.router.navigate(['/login']);
    }
  }

  /** `true` si el usuario tiene al menos uno de los roles indicados. ADMIN siempre pasa. */
  tieneRol(...roles: Rol[]): boolean {
    const actuales = this.roles();
    if (actuales.includes(Rol.ADMIN)) return true;
    return roles.some((rol) => actuales.includes(rol));
  }

  /** Consumido por `auth.guard`. La verificación real de la firma la hace el backend. */
  isAuthenticated(): boolean {
    return this.autenticado();
  }

  private actualizarPerfil(perfil: UsuarioActual): void {
    const actual = this.sesionSignal();
    if (!actual) return;
    const actualizado: Sesion = {
      ...actual,
      fullName: perfil.fullName ?? actual.fullName,
      roles: normalizarRoles(perfil.roles).length ? normalizarRoles(perfil.roles) : actual.roles,
    };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(actualizado));
    this.sesionSignal.set(actualizado);
  }

  private guardarSesion(respuesta: JwtResponse): void {
    const expiraEn = expiracionDe(respuesta.token) ?? Date.now() + (respuesta.expiresIn || 0);
    const sesion: Sesion = {
      token: respuesta.token,
      username: respuesta.username,
      fullName: respuesta.fullName,
      roles: normalizarRoles(respuesta.roles),
      expiraEn,
    };
    localStorage.setItem(CLAVE_TOKEN, sesion.token);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesionSignal.set(sesion);
  }

  private leerSesion(): Sesion | null {
    try {
      const bruto = localStorage.getItem(CLAVE_SESION);
      if (!bruto) return null;
      const sesion = JSON.parse(bruto) as Sesion;
      if (!sesion?.token) return null;
      if (sesion.expiraEn && sesion.expiraEn <= Date.now()) {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      return null;
    }
  }
}

function normalizarRoles(roles: unknown): Rol[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((rol) => String(rol).replace(/^ROLE_/, '') as Rol)
    .filter((rol): rol is Rol => Object.values(Rol).includes(rol));
}