import { HttpErrorResponse } from '@angular/common/http';
import { codigoDeError, mensajeDeError } from '../interceptors/error.interceptor';

/** Login fallido con el código de negocio del backend (AUTH_001 / AUTH_002 / AUTH_003). */
export class ErrorDeLogin extends Error {
  constructor(
    readonly codigo: string,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorDeLogin';
  }
}

export function mapearErrorLogin(error: unknown): ErrorDeLogin {
  return new ErrorDeLogin(codigoDeError(error), mensajeDeError(error));
}

/** Texto a mostrar en el login según la causa (LOGICA_NEGOCIO.md §6). */
export function mensajeDeLogin(codigo: string, mensajeOriginal: string): string {
  switch (codigo) {
    case 'AUTH_001':
      return mensajeOriginal || 'Credenciales inválidas';
    case 'AUTH_002':
      return 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta en 15 minutos.';
    case 'AUTH_003':
      return 'El usuario está inactivo. Contacta al administrador.';
    case 'AUTH_004':
    case 'AUTH_005':
      return 'La sesión expiró. Vuelve a iniciar sesión.';
    default:
      return mensajeOriginal || 'No se pudo iniciar sesión';
  }
}

/** Error de negocio con su código, para decisiones condicionales en la UI. */
export class ErrorNegocio extends Error {
  constructor(
    readonly codigo: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ErrorNegocio';
  }
}

export function mapearErrorNegocio(error: unknown): ErrorNegocio {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return new ErrorNegocio(codigoDeError(error), mensajeDeError(error), status);
}