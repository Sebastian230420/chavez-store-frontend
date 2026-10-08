import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReporteVentasDelDia } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { hoy } from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §12.8 — Ventas del día.
 * No es un arqueo de caja: solo resume las ventas registradas y los abonos recibidos.
 */
@Component({
  selector: 'app-reporte-ventas-del-dia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './reporte-ventas-del-dia.component.html',
  styleUrl: './reporte-ventas-del-dia.component.scss',
})
export class ReporteVentasDelDiaComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteVentasDelDia | null>(null);
  readonly fecha = signal(hoy());

  readonly margen = computed(() => {
    const resumen = this.reporte()?.resumen;
    if (!resumen || !resumen.ingresosTotal) return null;
    return (resumen.utilidad / resumen.ingresosTotal) * 100;
  });

  readonly cobertura = computed(() => {
    const resumen = this.reporte()?.resumen;
    if (!resumen || !resumen.creditoOtorgado) return null;
    return Math.min(100, (resumen.abonosRecibidos / resumen.creditoOtorgado) * 100);
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.ventasDelDia(this.fecha()).subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cambiarFecha(valor: string): void {
    if (!valor) return;
    this.fecha.set(valor);
    this.cargar();
  }

  hoyClick(): void {
    this.fecha.set(hoy());
    this.cargar();
  }
}