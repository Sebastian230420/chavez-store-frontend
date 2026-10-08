import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TipoPresentacion } from '../../core/enums';
import { Presentacion, PresentacionRequest } from '../../core/models/producto.model';
import { ProductoService } from '../../core/services/producto.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §6 — alta y edición de una presentación suelta.
 * R-C-05 unitsBase > 0 · R-C-06 precio obligatorio si es VENTA.
 */
@Component({
  selector: 'app-presentacion-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.presentacion ? 'Editar presentación' : 'Nueva presentación' }}
    </h2>
    <mat-dialog-content>
      <p class="cs-suave cs-sub">{{ data.productoNombre }}</p>

      <form [formGroup]="form" class="cs-form" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" maxlength="60" placeholder="Pack x6" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
        </mat-form-field>

        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Unidades base</mat-label>
            <input matInput formControlName="unitsBase" type="number" min="1" />
            <mat-hint>Factor de conversión</mat-hint>
            @if (form.controls.unitsBase.touched && form.controls.unitsBase.invalid) {
              <mat-error>Debe ser mayor a 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="type">
              <mat-option value="COMPRA">COMPRA</mat-option>
              <mat-option value="VENTA">VENTA</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (esVenta()) {
          <mat-form-field appearance="outline">
            <mat-label>Precio de venta (S/)</mat-label>
            <input matInput formControlName="price" type="number" min="0.01" step="0.01" />
            <mat-hint>Es el precio del pack completo, no el de la unidad</mat-hint>
            @if (form.controls.price.touched && form.controls.price.invalid) {
              <mat-error>El precio es obligatorio en presentaciones VENTA</mat-error>
            }
          </mat-form-field>
        } @else {
          <p class="cs-nota">
            Las presentaciones de compra no llevan precio: el costo llega con la compra
            y recalcula el promedio ponderado del producto (R-CO-03).
          </p>
        }

        <mat-form-field appearance="outline">
          <mat-label>Stock mínimo en esta presentación</mat-label>
          <input matInput formControlName="stockMin" type="number" min="0" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="cargando()" (click)="guardar()">
        {{ data.presentacion ? 'Guardar' : 'Agregar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cs-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 4px;
      }
      .cs-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 12px;
      }
      .cs-sub {
        margin: 0 0 10px;
        font-size: 13px;
      }
      .cs-nota {
        margin: 0;
        padding: 9px 12px;
        border-radius: 8px;
        background: #f3f5f7;
        color: var(--cs-texto-suave);
        font-size: 12.5px;
        line-height: 1.5;
      }
    `,
  ],
})
export class PresentacionFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productos = inject(ProductoService);
  private readonly dialogRef = inject(MatDialogRef<PresentacionFormDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly data = inject<{ productoId: number; productoNombre: string; presentacion: Presentacion | null }>(
    MAT_DIALOG_DATA,
  );

  readonly cargando = signal(false);
  readonly tipos = Object.values(TipoPresentacion);

  readonly form = this.fb.nonNullable.group(
    {
      name: [this.data.presentacion?.name ?? '', [Validators.required, Validators.maxLength(60)]],
      unitsBase: [this.data.presentacion?.unitsBase ?? 1, [Validators.required, Validators.min(1)]],
      type: [this.data.presentacion?.type ?? TipoPresentacion.VENTA, [Validators.required]],
      price: [this.data.presentacion?.price ?? null as number | null],
      stockMin: [this.data.presentacion?.stockMin ?? null as number | null],
      sortOrder: [this.data.presentacion?.sortOrder ?? 0],
      active: [this.data.presentacion?.active ?? true],
    },
    { validators: (g) => this.validar(g) },
  );

  readonly esVenta = computed(() => this.form.controls.type.value === TipoPresentacion.VENTA);

  /** R-C-06: una presentación VENTA necesita precio. */
  private validar(grupo: AbstractControl): Record<string, boolean> | null {
    if (grupo.get('type')?.value !== TipoPresentacion.VENTA) return null;
    const precio = grupo.get('price')?.value;
    return precio !== null && precio !== undefined && Number(precio) > 0 ? null : { precioRequerido: true };
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const valor = this.form.getRawValue();
    const request: PresentacionRequest = {
      name: valor.name,
      unitsBase: Number(valor.unitsBase),
      type: valor.type,
      price: valor.type === TipoPresentacion.VENTA ? Number(valor.price) : 0,
      stockMin: valor.stockMin === null ? null : Number(valor.stockMin),
      sortOrder: Number(valor.sortOrder),
      active: valor.active,
    };

    const peticion = this.data.presentacion
      ? this.productos.actualizarPresentacion(this.data.presentacion.id, request)
      : this.productos.agregarPresentacion(this.data.productoId, request);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacion.exito(this.data.presentacion ? 'Presentación actualizada' : 'Presentación agregada');
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