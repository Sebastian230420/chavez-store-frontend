import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  /** consequenceso de la acción, en rojo. */
  advertencia?: string;
  confirmar?: string;
  cancelar?: string;
}

/**
 * Confirmación para acciones destructivas (desactivar producto, anular venta,
 * anular abono…). `tone: 'peligro'` pinta el botón de confirmar en rojo.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p class="mensaje">{{ data.mensaje }}</p>
      @if (data.advertencia) {
        <p class="advertencia">
          <mat-icon inline>warning</mat-icon>
          {{ data.advertencia }}
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar(false)">
        {{ data.cancelar ?? 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="peligro ? 'warn' : 'primary'"
        (click)="cerrar(true)"
      >
        {{ data.confirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .mensaje {
        margin: 0;
        max-width: 52ch;
      }
      .advertencia {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 14px 0 0;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--cs-error-bg);
        color: var(--cs-error);
        font-size: 13px;
      }
      .advertencia mat-icon {
        flex: 0 0 auto;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  /** Se activa si el mensaje o la advertencia hablan de eliminar/anular. */
  readonly peligro =
    /anul|elimin|desactiv|borrar/i.test(this.data.titulo) ||
    !!this.data.advertencia;

  cerrar(resultado: boolean): void {
    this.dialogRef.close(resultado);
  }
}