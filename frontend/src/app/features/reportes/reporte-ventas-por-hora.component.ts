import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import { ReporteVentasPorHora } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import {
  RangoFechasComponent,
  rangoMesActual,
} from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §12.4 — Ventas por hora (demanda por franja).
 * R-R-09 agrupa por `HOUR(sale_date)`. Sirve para decidir en qué franja
 * tener más personal o más stock.
 */
@Component({
  selector: 'app-reporte-ventas-por-hora',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    BaseChartDirective,
    RangoFechasComponent,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
  ],
  templateUrl: './reporte-ventas-por-hora.component.html',
  styleUrl: './reporte-ventas-por-hora.component.scss',
})
export class ReporteVentasPorHoraComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteVentasPorHora | null>(null);

  readonly desde = signal(rangoMesActual().desde);
  readonly hasta = signal(rangoMesActual().hasta);

  readonly datosGrafica = computed<ChartData<'bar'>>(() => {
    const porHora = this.reporte()?.porHora ?? [];
    return {
      labels: porHora.map((h) => this.etiquetaHora(h.hora)),
      datasets: [
        {
          label: 'Ventas',
          data: porHora.map((h) => h.ventasCount),
          backgroundColor: porHora.map((h) =>
            h.hora === this.reporte()?.horaPico ? '#c0392b' : '#0f6fc0',
          ),
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          label: 'Ingresos',
          data: porHora.map((h) => h.ingresos),
          type: 'line' as never,
          borderColor: '#1f8a4c',
          backgroundColor: '#1f8a4c',
          tension: 0.25,
          pointRadius: 3,
          yAxisID: 'y1',
        },
      ],
    };
  });

  readonly opcionesGrafica: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left',
        title: { display: true, text: 'Ventas' },
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => `S/ ${Number(v).toFixed(0)}` },
        title: { display: true, text: 'Ingresos' },
      },
    },
  };

  readonly horaPico = computed(() => this.reporte()?.horaPico ?? null);
  readonly horaBaja = computed(() => this.reporte()?.horaBaja ?? null);

  readonly delPico = computed(() =>
    this.reporte()?.porHora.find((h) => h.hora === this.horaPico()) ?? null,
  );
  readonly deLaBaja = computed(() =>
    this.reporte()?.porHora.find((h) => h.hora === this.horaBaja()) ?? null,
  );

  readonly totalVentas = computed(
    () => this.reporte()?.porHora.reduce((suma, h) => suma + h.ventasCount, 0) ?? 0,
  );

  readonly totalIngresos = computed(
    () => this.reporte()?.porHora.reduce((suma, h) => suma + h.ingresos, 0) ?? 0,
  );

  readonly ticketPromedioGeneral = computed(() =>
    this.totalVentas() === 0 ? 0 : this.totalIngresos() / this.totalVentas(),
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.ventasPorHora(this.desde(), this.hasta()).subscribe({
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

  cambiarRango(rango: { desde: string; hasta: string }): void {
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);
    this.cargar();
  }

  /** `8` → `"08:00"` */
  etiquetaHora(hora: number | null): string {
    return hora === null || hora === undefined ? '—' : `${String(hora).padStart(2, '0')}:00`;
  }

  /** Peso de una franja sobre el total de ventas del período. */
  porcentajeDelTotal(ventas: number): number {
    const total = this.totalVentas();
    return total > 0 ? (ventas / total) * 100 : 0;
  }
}