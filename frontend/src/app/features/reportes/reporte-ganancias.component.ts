import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import { ReporteGanancias } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import {
  RangoFechasComponent,
  rangoMesActual,
} from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { descargarArchivo } from '../../shared/utils/descarga';

/**
 * ESQUEMA_API.md §12.1 — Ganancias por período.
 * R-R-01 solo ventas PAGADA · R-R-02 utilidad = ingresos − costo − mermas
 * R-R-03 el costo es el snapshot congelado al registrar la venta.
 */
@Component({
  selector: 'app-reporte-ganancias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    BaseChartDirective,
    RangoFechasComponent,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './reporte-ganancias.component.html',
  styleUrl: './reporte-ganancias.component.scss',
})
export class ReporteGananciasComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly exportando = signal(false);
  readonly reporte = signal<ReporteGanancias | null>(null);

  readonly desde = signal(rangoMesActual().desde);
  readonly hasta = signal(rangoMesActual().hasta);

  /** Línea de tiempo: ingresos, costo y utilidad por día. */
  readonly datosGrafica = computed<ChartData<'line'>>(() => {
    const porDia = this.reporte()?.porDia ?? [];
    return {
      labels: porDia.map((d) => this.etiquetaDia(d.fecha)),
      datasets: [
        {
          label: 'Ingresos',
          data: porDia.map((d) => d.ingresos),
          borderColor: '#0f6fc0',
          backgroundColor: 'rgba(15, 111, 192, 0.12)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
        },
        {
          label: 'Costo de ventas',
          data: porDia.map((d) => d.costo),
          borderColor: '#b26a00',
          backgroundColor: 'rgba(178, 106, 0, 0.12)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
        },
        {
          label: 'Mermas',
          data: porDia.map((d) => d.mermas),
          borderColor: '#c0392b',
          backgroundColor: 'rgba(192, 57, 43, 0.12)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
        },
        {
          label: 'Utilidad',
          data: porDia.map((d) => d.utilidad),
          borderColor: '#1f8a4c',
          backgroundColor: 'rgba(31, 138, 76, 0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly opcionesGrafica: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatearMoneda(Number(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (valor) => `S/ ${Number(valor).toFixed(0)}`,
        },
      },
    },
  };

  readonly margenNegativo = computed(() => (this.reporte()?.totales.margenPct ?? 0) < 0);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.ganancias(this.desde(), this.hasta()).subscribe({
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

  /** ESQUEMA_API.md §12.9 */
  exportar(formato: 'excel' | 'pdf'): void {
    this.exportando.set(true);
    this.reportes.exportarGanancias(formato, this.desde(), this.hasta()).subscribe({
      next: (blob) => {
        this.exportando.set(false);
        descargarArchivo(
          blob,
          `ganancias-${this.desde()}-a-${this.hasta()}.${formato}`,
        );
      },
      error: (err: unknown) => {
        this.exportando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  private etiquetaDia(fecha: string): string {
    const d = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? fecha
      : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' }).format(d);
  }

  imprimir(): void {
    window.print();
  }
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(valor);
}