import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Cliente } from '../../core/models/cliente.model';
import { ClienteService } from '../../core/services/cliente.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { MonedaPipe } from '../../shared/pipes/formato.pipe';

/** `PUT /api/clientes/{id}/limite-credito` — R-CL-04 solo ADMIN. */
@Component({
  selector: 'app-limite-credito-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MonedaPipe],
  template: `
    <h2 mat-dialog-title>Límite de crédito</h2>
    <mat-dialog-content>
      <p class="cs-suave cs-sub">
        {{ cliente.fullName }} · saldo actual {{ cliente.saldoActual ?? 0 | moneda }}
      </p>

      <form [formGroup]="form" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Nuevo límite</mat-label>
          <input matInput formControlName="creditLimit" type="number" min="0" step="0.01" />
          <span matTextPrefix>S/&nbsp;</span>
          <mat-hint>0 = sin cupo: no podrá recibir ventas a crédito (SAL_004)</mat-hint>
          @if (form.controls.creditLimit.touched && form.controls.creditLimit.invalid) {
            <mat-error>El límite no puede ser negativo</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="cargando()" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cs-sub {
        font-size: 13px;
        margin: 0 0 12px;
      }
      form {
        padding-top: 4px;
      }
    `,
  ],
})
export class LimiteCreditoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientes = inject(ClienteService);
  private readonly dialogRef = inject(MatDialogRef<LimiteCreditoDialogComponent, Cliente | null>);
  private readonly notificacion = inject(NotificacionService);

  readonly cliente = inject<Cliente>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    creditLimit: [Number(this.cliente.creditLimit ?? 0), [Validators.required, Validators.min(0)]],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.clientes
      .actualizarLimiteCredito(this.cliente.id, this.form.getRawValue())
      .subscribe({
        next: (cliente) => {
          this.cargando.set(false);
          this.notificacion.exito('Límite de crédito actualizado');
          this.dialogRef.close(cliente);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.notificacion.error(mensajeDeError(err));
        },
      });
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}