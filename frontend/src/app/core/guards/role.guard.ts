import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../enums';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';

/**
 * Restringe una ruta a ciertos roles.
 * Uso: `{ path: 'x', canActivate: [roleGuard], data: { roles: [Rol.ADMIN] } }`
 *
 * La matriz de roles por endpoint está en ESQUEMA_API.md §13. Esta comprobación
 * es solo de UX: la autorización real la aplica el backend (AUTH_006).
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  const permitidos = (route.data?.['roles'] as Rol[] | undefined) ?? [];
  if (permitidos.length === 0) return true;

  if (auth.tieneRol(...permitidos)) return true;

  notificacion.error('No tienes permisos para acceder a esta sección.');
  return router.createUrlTree(['/']);
};