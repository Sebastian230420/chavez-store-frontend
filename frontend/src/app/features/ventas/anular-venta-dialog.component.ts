import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Venta } from '../../core/models/venta.model';
import { VentaService } from '../../core/services/venta.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * `PATCH /api/ventas/{id}/anular` — ESQUEMA_API.md §10.5
 * R-V-09 revierte el stock al lote original y deja la venta registrada.
 * R-V-10 solo ADMIN; una venta ya ANULADA devuelve SAL_002.
 */
@Component({
  selector: 'app-anular-venta-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Anular venta {{ venta.document }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cs-form" novalidate>
        <p class="cs-suave cs-sub">
          Se generarán movimientos de stock inversos y la venta quedará registrada como
          ANULADA para conservar la trazabilidad.
        </p>

        <mat-form-field appearance="outline">
          <mat-label>Motivo de la anulación</mat-label>
          <textarea
            matInput
            formControlName="reason"
            rows="3"
            maxlength="255"
            placeholder="Ej: se contó producto equivocado"
          ></textarea>
          @if (form.controls.reason.touched && form.controls.reason.invalid) {
            <mat-error>El motivo es obligatorio y debe tener al menos 10 caracteres</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button color="warn" type="button" [disabled]="cargando()" (click)="anular()">
        Anular venta
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cs-form {
        display: flex;
        flex-direction: column;
        padding-top: 4px;
      }
      .cs-sub {
        font-size: 12.5px;
        margin: 0 0 12px;
      }
    `,
  ],
})
export class AnularVentaDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ventas = inject(VentaService);
  private readonly dialogRef = inject(MatDialogRef<AnularVentaDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly venta = inject<Venta>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(255)]],
  });

  anular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.ventas.anular(this.venta.id, this.form.getRawValue()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacion.exito(`Venta ${this.venta.document} anulada`);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}