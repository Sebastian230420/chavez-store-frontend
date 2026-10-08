import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import { MotivoMerma } from '../../core/enums';
import { ReporteMermas } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
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
 * ESQUEMA_API.md §12.6 — Mermas y pérdidas.
 * R-R-06 se miden por `stock_movements.type = MERMA` en el período.
 *
 * La merma es el único movimiento que quema capital directamente, así que
 * este reporte es la contracara del de ganancias:sin mermas, la utilidad
 * real de un producto es igual a la teórica.
 */
@Component({
  selector: 'app-reporte-mermas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
    BaseChartDirective,
    RangoFechasComponent,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
  ],
  templateUrl: './reporte-mermas.component.html',
  styleUrl: './reporte-mermas.component.scss',
})
export class ReporteMermasComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly motivos = Object.values(MotivoMerma);

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteMermas | null>(null);

  readonly desde = signal(rangoMesActual().desde);
  readonly hasta = signal(rangoMesActual().hasta);
  readonly motivo = signal<string | null>(null);

  readonly datos = computed(() => this.reporte() ?? null);

  readonly motivoPrincipal = computed(() => {
    const motivos = this.reporte()?.porMotivo ?? [];
    return motivos.length ? motivos[0] : null;
  });

  readonly costoPorUnidad = computed(() => {
    const totales = this.reporte()?.totales;
    if (!totales || totales.unidades === 0) return 0;
    return totales.costoPerdido / totales.unidades;
  });

  readonly datosGrafica = computed<ChartData<'bar'>>(() => {
    const porMotivo = this.reporte()?.porMotivo ?? [];
    return {
      labels: porMotivo.map((m) => m.motivo),
      datasets: [
        {
          label: 'Costo perdido',
          data: porMotivo.map((m) => m.costoPerdido),
          backgroundColor: '#c0392b',
          borderRadius: 4,
        },
      ],
    };
  });

  readonly opcionesGrafica: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` S/ ${Number(ctx.parsed.y).toFixed(2)}`,
        },
      },
    },
    scales: { y: { beginAtZero: true } },
  };

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.mermas(this.desde(), this.hasta(), this.motivo()).subscribe({
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

  cambiarMotivo(valor: string | null): void {
    this.motivo.set(valor);
    this.cargar();
  }
}