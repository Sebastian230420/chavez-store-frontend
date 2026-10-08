import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';

/**
 * Agrega `Authorization: Bearer <token>` a cada request saliente
 * (ARQUITECTURA.md §6.2) y resuelve la sesión ante 401 / 403 AUTH_006.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  const token = auth.token();
  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const status = (error as { status?: number }).status;

      if (status === 401 && !req.url.includes('/api/auth/login')) {
        auth.logout();
        notificacion.aviso('Tu sesión expiró. Vuelve a iniciar sesión.');
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      } else if (status === 403) {
        const codigo = (error as { error?: { code?: string } })?.error?.code;
        if (codigo === 'AUTH_003') {
          // Usuario inactivo: la sesión no sirve de nada.
          auth.logout();
          router.navigate(['/login']);
        } else if (codigo === 'AUTH_006') {
          // Rol insuficiente: se mantiene la sesión, solo se informa.
          notificacion.error('No tienes permisos para realizar esta operación.');
        }
      }

      return throwError(() => error);
    }),
  );
};