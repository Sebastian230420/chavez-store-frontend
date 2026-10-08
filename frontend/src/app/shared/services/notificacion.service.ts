import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

type TipoAviso = 'exito' | 'error' | 'info' | 'aviso';

const CLASES: Record<TipoAviso, string> = {
  exito: 'cs-snack cs-snack--exito',
  error: 'cs-snack cs-snack--error',
  info: 'cs-snack cs-snack--info',
  aviso: 'cs-snack cs-snack--aviso',
};

/**
 * Snackbars de la aplicación. Los mensajes de negocio se muestran aquí
 * cuando no hay un componente que los presente en línea (ver `error.interceptor.ts`).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly abierta = signal<MatSnackBarRef<TextOnlySnackBar> | null>(null);

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'exito', 3000);
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'error', 7000);
  }

  info(mensaje: string): void {
    this.mostrar(mensaje, 'info', 4000);
  }

  aviso(mensaje: string): void {
    this.mostrar(mensaje, 'aviso', 5000);
  }

  cerrar(): void {
    this.abierta()?.dismiss();
    this.abierta.set(null);
  }

  private mostrar(mensaje: string, tipo: TipoAviso, duracion: number): void {
    this.cerrar();
    const config: MatSnackBarConfig = {
      duration: duracion,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [CLASES[tipo]],
    };
    this.abierta.set(this.snackBar.open(mensaje, 'Cerrar', config));
  }
}