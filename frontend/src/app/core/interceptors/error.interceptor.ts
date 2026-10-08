import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';
import { NotificacionService } from '../../shared/services/notificacion.service';

/**
 * Normaliza cualquier error HTTP al formato estándar del backend
 * (ESQUEMA_API.md §14) para que los componentes muestren siempre `message`.
 *
 * El error de negocio viaja en `error.error`; los errores de validación de
 * Bean Validation llegan como mapa de campo → mensaje y se resumyen.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);

      // 401 fuera del login: la sesión venció o el token es inválido.
      // El jwt.interceptor se encarga del logout; aquí solo evitamos el doble aviso.
      if (apiError.status === 401 && !req.url.includes('/api/auth/login')) {
        return throwError(() => error);
      }

      // Los 4xx son decisiones del usuario: los muestra el componente que dispara la acción.
      // Los 5xx y los fallos de red son fallos de plataforma → snackbar global.
      if (apiError.status >= 500 || apiError.status === 0) {
        notificacion.error(apiError.message);
      }

      return throwError(() => error);
    }),
  );
};

interface ApiErrorNormalizada extends ApiError {
  status: number;
}

function toApiError(error: unknown): ApiErrorNormalizada {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, code: 'ERR_DESCONOCIDO', message: 'Ocurrió un error inesperado' };
  }

  const status = error.status;
  const cuerpo = error.error as Record<string, unknown> | string | null;

  if (cuerpo && typeof cuerpo === 'object' && 'code' in cuerpo && 'message' in cuerpo) {
    const e = cuerpo as unknown as ApiError;
    return { ...e, status };
  }

  // Bean Validation: { "nombre": "no debe ser menor a 3", ... }
  if (cuerpo && typeof cuerpo === 'object') {
    const mensajes = Object.entries(cuerpo)
      .map(([campo, texto]) => `${campo}: ${String(texto)}`)
      .join(' · ');
    if (mensajes) {
      return { status, code: 'VAL_001', message: mensajes };
    }
  }

  if (status === 0) {
    return { status, code: 'ERR_RED', message: 'No se pudo conectar con el servidor' };
  }

  return { status, code: `HTTP_${status}`, message: error.message || `Error ${status}` };
}

/** Extrae el mensaje de negocio de un HttpErrorResponse. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return toApiError(error).message;
  }
  return 'Ocurrió un error inesperado';
}

/** Extrae el código de negocio (`STK_001`, `SAL_003`, …) de un HttpErrorResponse. */
export function codigoDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return toApiError(error).code;
  }
  return 'ERR_DESCONOCIDO';
}