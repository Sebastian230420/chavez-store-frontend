import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Compra, CompraRecibidaResponse } from '../../core/models/compra.model';
import { CompraService } from '../../core/services/compra.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { DecimalPipe } from '@angular/common';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';

/**
 * `POST /api/compras/{id}/recibir` — ESQUEMA_API.md §9.3
 * El servidor crea un lote por ítem, suma el stock y recalcula el costo promedio
 * ponderado (R-CO-03). Aquí solo se confirma y se muestra qué cambió.
 */
@Component({
  selector: 'app-recibir-compra-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
    DecimalPipe,
    EnteroPipe,
    MonedaPipe,
    FechaPipe,
  ],
  templateUrl: './recibir-compra-dialog.component.html',
  styleUrl: './recibir-compra-dialog.component.scss',
})
export class RecibirCompraDialogComponent {
  private readonly compras = inject(CompraService);
  private readonly dialogRef = inject(MatDialogRef<RecibirCompraDialogComponent, CompraRecibidaResponse | null>);
  private readonly notificacion = inject(NotificacionService);

  readonly compra = inject<Compra>(MAT_DIALOG_DATA);

  readonly cargando = signal(false);
  readonly resultado = signal<CompraRecibidaResponse | null>(null);
  readonly unidadesTotales = signal(0);

  readonly costoSubio = computed(() => {
    const productos = this.resultado()?.productosActualizados ?? [];
    return productos.some((p) => p.costoNuevo > p.costoAnterior);
  });

  readonly costoBajo = computed(() => {
    const productos = this.resultado()?.productosActualizados ?? [];
    return productos.some((p) => p.costoNuevo < p.costoAnterior);
  });

  constructor() {
    this.unidadesTotales.set(this.compra.detalles?.reduce((suma, d) => suma + d.unitsBase, 0) ?? 0);
  }

  confirmar(): void {
    if (this.resultado()) {
      this.dialogRef.close(this.resultado());
      return;
    }

    this.cargando.set(true);
    this.compras.recibir(this.compra.id).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.resultado.set(respuesta);
        this.notificacion.exito('Compra recibida: stock y lotes actualizados');
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