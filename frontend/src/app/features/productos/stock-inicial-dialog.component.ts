import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Producto, StockInicialRequest } from '../../core/models/producto.model';
import { ProductoService } from '../../core/services/producto.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** Controles de una línea de lote dentro del FormArray. */
export interface LoteFormControls {
  lotCode: FormControl<string>;
  expiryDate: FormControl<string | null>;
  qty: FormControl<number>;
  costUnit: FormControl<number>;
}

/**
 * `POST /api/productos/{id}/stock-inicial` — ESQUEMA_API.md §5.5
 * R-I-06: rol ADMIN | SUPERVISOR y motivo obligatorio.
 * Los lotes son opcionales: un producto sin vencimiento es válido (`lots.expiry_date` admite NULL).
 */
@Component({
  selector: 'app-stock-inicial-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './stock-inicial-dialog.component.html',
  styleUrl: './stock-inicial-dialog.component.scss',
})
export class StockInicialDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productos = inject(ProductoService);
  private readonly dialogRef = inject(MatDialogRef<StockInicialDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly producto = inject<Producto>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    unitsBase: [
      this.producto.stock || (null as number | null),
      [Validators.required, Validators.min(1)],
    ],
    reason: ['Inventario inicial de apertura de tienda', [Validators.required, Validators.minLength(5)]],
    lotes: this.fb.array<FormGroup<LoteFormControls>>([]),
  });

  get lotes(): FormArray<FormGroup<LoteFormControls>> {
    return this.form.controls.lotes;
  }

  /** R-I-02/R-I-03: la carga genera movimientos INVENTARIO_INICIAL por cada lote. */
  readonly totalLotes = computed(() =>
    this.lotes.controls.reduce((suma, g) => suma + Number(g.controls.qty.value ?? 0), 0),
  );

  readonly sinCoincidencia = computed(() => {
    const total = Number(this.form.controls.unitsBase.value ?? 0);
    const lotes = this.totalLotes();
    if (lotes === 0) return false;
    return total !== lotes;
  });

  agregarLote(): void {
    this.lotes.push(
      this.fb.nonNullable.group({
        lotCode: this.fb.nonNullable.control<string>(
          this.loteSugerido(this.lotes.length + 1),
          [Validators.required, Validators.maxLength(60)],
        ),
        expiryDate: this.fb.nonNullable.control<string | null>(null),
        qty: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(1)]),
        costUnit: this.fb.nonNullable.control<number>(this.producto.costAvg || 0, [
          Validators.required,
          Validators.min(0.0001),
        ]),
      }),
    );
  }

  private loteSugerido(secuencia: number): string {
    const base = this.producto.sku || `PROD${String(this.producto.id).padStart(6, '0')}`;
    return `LOTE-${base}-${String(secuencia).padStart(3, '0')}`;
  }

  quitarLote(indice: number): void {
    this.lotes.removeAt(indice);
  }

  guardar(): void {
    if (this.form.invalid || this.lotes.invalid) {
      this.form.markAllAsTouched();
      this.lotes.controls.forEach((g) => g.markAllAsTouched());
      return;
    }

    const valor = this.form.getRawValue();
    const request: StockInicialRequest = {
      unitsBase: Number(valor.unitsBase),
      reason: valor.reason,
      lotes: valor.lotes.map((l) => ({
        lotCode: l.lotCode,
        expiryDate: l.expiryDate || null,
        qty: Number(l.qty),
        costUnit: Number(l.costUnit),
      })),
    };

    this.cargando.set(true);
    this.productos.cargarStockInicial(this.producto.id, request).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacion.exito('Stock inicial cargado');
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