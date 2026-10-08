import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { EstadoCompra, Rol } from '../../core/enums';
import { Compra, CompraRecibidaResponse } from '../../core/models/compra.model';
import { AuthService } from '../../core/services/auth.service';
import { CompraService } from '../../core/services/compra.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { RecibirCompraDialogComponent } from './recibir-compra-dialog.component';

/**
 * `GET /api/compras/{id}` — ESQUEMA_API.md §9.3
 * R-CO-02 solo ADMIN | ALMACENERO recibe · R-CO-04/05 solo ADMIN anula una compra recibida.
 */
@Component({
  selector: 'app-compra-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressBarModule,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
    FechaPipe,
  ],
  templateUrl: './compra-detalle.component.html',
  styleUrl: './compra-detalle.component.scss',
})
export class CompraDetalleComponent {
  private readonly compras = inject(CompraService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly id = input.required<string>();
  readonly Rol = Rol;
  readonly EstadoCompra = EstadoCompra;

  readonly cargando = signal(true);
  readonly procesando = signal(false);
  readonly compra = signal<Compra | null>(null);

  readonly esRegistrada = computed(() => this.compra()?.status === EstadoCompra.REGISTRADA);
  readonly esRecibida = computed(() => this.compra()?.status === EstadoCompra.RECIBIDA);
  readonly esAnulada = computed(() => this.compra()?.status === EstadoCompra.ANULADA);

  readonly puedeRecibir = computed(() => this.esRegistrada() && this.auth.tieneRol(Rol.ADMIN, Rol.ALMACENERO));
  readonly puedeAnular = computed(() => !this.esAnulada() && this.auth.tieneRol(Rol.ADMIN));

  readonly unidadesTotales = computed(
    () => this.compra()?.detalles.reduce((suma, d) => suma + d.qtyBought, 0) ?? 0,
  );

  constructor() {
    queueMicrotask(() => this.cargar(Number(this.id())));
  }

  cargar(id: number): void {
    if (!id) return;
    this.cargando.set(true);
    this.compras.obtener(id).subscribe({
      next: (compra) => {
        this.compra.set(compra);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
        void this.router.navigate(['/compras']);
      },
    });
  }

  recibir(): void {
    const compra = this.compra();
    if (!compra) return;

    this.dialog
      .open(RecibirCompraDialogComponent, { width: '760px', maxWidth: '96vw', data: compra })
      .afterClosed()
      .subscribe((respuesta?: CompraRecibidaResponse | null) => {
        if (respuesta) this.cargar(compra.id);
      });
  }

  /** R-CO-05: anular una compra RECIBIDA genera DEVOLUCION_PROVEEDOR y recalcula el costo. */
  anular(): void {
    const compra = this.compra();
    if (!compra) return;

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '500px',
        data: {
          titulo: 'Anular compra',
          mensaje: `¿Anular la compra ${compra.document}?`,
          advertencia:
            compra.status === EstadoCompra.RECIBIDA
              ? 'La compra ya fue recibida: se devolverá el stock a los lotes y se recalculará el costo promedio de los productos afectados.'
              : 'La compra no había sido recibida, así que no afecta al stock.',
          confirmar: 'Anular compra',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.procesando.set(true);
        this.compras.anular(compra.id).subscribe({
          next: () => {
            this.procesando.set(false);
            this.notificacion.exito('Compra anulada');
            this.cargar(compra.id);
          },
          error: (err: unknown) => {
            this.procesando.set(false);
            this.notificacion.error(mensajeDeError(err));
          },
        });
      });
  }

  volver(): void {
    void this.router.navigate(['/compras']);
  }
}