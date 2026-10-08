import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MotivoMerma } from '../../core/enums';
import { LoteDetalle } from '../../core/models/inventario.model';
import { Producto } from '../../core/models/producto.model';
import { InventarioService } from '../../core/services/inventario.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';

/**
 * `POST /api/inventario/mermas` — ESQUEMA_API.md §7.2
 * R-I-07 motivo obligatorio del catálogo · R-I-08 solo lotes con `qty_remaining > 0`
 * El descuento se hace por FEFO si no se indica lote.
 */
@Component({
  selector: 'app-merma-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EnteroPipe,
    MonedaPipe,
    FechaPipe,
  ],
  templateUrl: './merma-dialog.component.html',
  styleUrl: './merma-dialog.component.scss',
})
export class MermaDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly inventario = inject(InventarioService);
  private readonly dialogRef = inject(MatDialogRef<MermaDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly producto = inject<Producto>(MAT_DIALOG_DATA);
  readonly motivos = Object.values(MotivoMerma);
  readonly cargando = signal(false);
  readonly cargandoLotes = signal(true);
  readonly lotes = signal<LoteDetalle[]>([]);

  readonly form = this.fb.nonNullable.group({
    qty: [1, [Validators.required, Validators.min(1)]],
    lotId: [null as number | null],
    reason: ['' as string, [Validators.required]],
  });

  readonly qty = computed(() => Number(this.form.controls.qty.value || 0));

  /** R-I-08: la merma solo puede aplicarse sobre lotes con existencia. */
  readonly lotesConExistencia = computed(() =>
    this.lotes()
      .filter((l) => l.qtyRemaining > 0)
      .sort((a, b) => {
        // FEFO: vence primero el que vence antes; los sin vencimiento al final (R-I-10).
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      }),
  );

  readonly totalEnLotes = computed(() =>
    this.lotesConExistencia().reduce((suma, l) => suma + l.qtyRemaining, 0),
  );

  readonly loteSeleccionado = computed(
    () => this.lotesConExistencia().find((l) => l.lotId === this.form.controls.lotId.value) ?? null,
  );

  /** Tope válido: el del lote elegido, o la suma de todos si es merma por FEFO. */
  readonly tope = computed(() => {
    const lote = this.loteSeleccionado();
    return lote ? lote.qtyRemaining : this.totalEnLotes();
  });

  readonly excedeLotes = computed(() => this.qty() > this.tope());

  readonly costoPerdido = computed(() => this.qty() * (this.producto.costAvg || 0));

  constructor() {
    this.inventario.stock(this.producto.id).subscribe({
      next: (stock) => {
        this.lotes.set(stock.lotes);
        this.cargandoLotes.set(false);
      },
      error: (err: unknown) => {
        this.cargandoLotes.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  guardar(): void {
    if (this.form.invalid || this.excedeLotes()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    this.cargando.set(true);

    this.inventario
      .registrarMerma({
        productoId: this.producto.id,
        qty: Number(valor.qty),
        lotId: valor.lotId,
        reason: valor.reason,
      })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);
          this.notificacion.exito(
            `Merma registrada: ${respuesta.lotesAfectados.length} lote(s) afectado(s)`,
          );
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