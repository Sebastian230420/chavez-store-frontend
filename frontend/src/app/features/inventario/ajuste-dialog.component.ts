import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Producto } from '../../core/models/producto.model';
import { StockProducto } from '../../core/models/inventario.model';
import { InventarioService } from '../../core/services/inventario.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { EnteroPipe } from '../../shared/pipes/formato.pipe';

/**
 * `POST /api/inventario/ajustes` — ESQUEMA_API.md §7.3
 * R-I-06 rol ADMIN | SUPERVISOR y motivo obligatorio.
 * R-I-01 el stock resultante nunca puede ser negativo.
 *
 * El valor es un **delta** en unidad base: positivo suma, negativo resta.
 * El servidor decide si es AJUSTE_POSITIVO o AJUSTE_NEGATIVO.
 */
@Component({
  selector: 'app-ajuste-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EnteroPipe,
  ],
  templateUrl: './ajuste-dialog.component.html',
  styleUrl: './ajuste-dialog.component.scss',
})
export class AjusteDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly inventario = inject(InventarioService);
  private readonly dialogRef = inject(MatDialogRef<AjusteDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly producto = inject<Producto>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    unitsBase: [0, [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(255)]],
  });

  readonly delta = computed(() => Number(this.form.controls.unitsBase.value || 0));
  readonly stockResultante = computed(() => this.producto.stock + this.delta());

  /** R-I-01: nunca stock negativo. */
  readonly negativo = computed(() => this.stockResultante() < 0);
  readonly sinCambio = computed(() => this.delta() === 0);

  readonly tipoMovimiento = computed(() =>
    this.delta() > 0 ? 'AJUSTE_POSITIVO' : this.delta() < 0 ? 'AJUSTE_NEGATIVO' : '—',
  );

  guardar(): void {
    if (this.form.invalid || this.negativo() || this.sinCambio()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.cargando.set(true);

    this.inventario
      .ajustar({
        productoId: this.producto.id,
        unitsBase: Number(valor.unitsBase),
        reason: valor.reason,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.notificacion.exito('Ajuste registrado');
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

  /** Atajo: completar la diferencia entre el conteo físico y el stock del sistema. */
  setConteoFisico(stockFisico: number): void {
    this.form.controls.unitsBase.setValue(stockFisico - this.producto.stock);
  }
}