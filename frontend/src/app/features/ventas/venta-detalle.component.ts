import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { EstadoVenta, Rol } from '../../core/enums';
import { Venta } from '../../core/models/venta.model';
import { AuthService } from '../../core/services/auth.service';
import { VentaService } from '../../core/services/venta.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { AnularVentaDialogComponent } from './anular-venta-dialog.component';

/**
 * `GET /api/ventas/{id}` — ESQUEMA_API.md §10.4
 * Muestra el costo congelado por ítem (R-V-15) y el lote consumido (FEFO).
 */
@Component({
  selector: 'app-venta-detalle',
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
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.scss',
})
export class VentaDetalleComponent {
  private readonly ventas = inject(VentaService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  /** Bound desde la ruta `/ventas/:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly Rol = Rol;
  readonly cargando = signal(true);
  readonly venta = signal<Venta | null>(null);

  readonly anulada = computed(() => this.venta()?.status === EstadoVenta.ANULADA);
  readonly puedeAnular = computed(() => this.auth.tieneRol(Rol.ADMIN) && !this.anulada());

  readonly unidadesBaseTotales = computed(
    () => this.venta()?.detalles.reduce((suma, d) => suma + d.unitsBase, 0) ?? 0,
  );

  readonly margenPct = computed(() => {
    const venta = this.venta();
    if (!venta || !venta.total) return null;
    return (venta.profit / venta.total) * 100;
  });

  constructor() {
    // El input de ruta todavía no está disponible en el constructor:
    // se lee en el primer cambio de detección.
    queueMicrotask(() => this.cargar(Number(this.id())));
  }

  cargar(id: number): void {
    if (!id) return;
    this.cargando.set(true);
    this.ventas.obtener(id).subscribe({
      next: (venta) => {
        this.venta.set(venta);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
        void this.router.navigate(['/ventas']);
      },
    });
  }

  anular(): void {
    const venta = this.venta();
    if (!venta) return;

    this.dialog
      .open(AnularVentaDialogComponent, { width: '520px', maxWidth: '94vw', data: venta })
      .afterClosed()
      .subscribe((anulada?: boolean) => {
        if (anulada) this.cargar(venta.id);
      });
  }

  volver(): void {
    void this.router.navigate(['/ventas']);
  }
}