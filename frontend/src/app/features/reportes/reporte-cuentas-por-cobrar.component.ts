import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReporteCuentasPorCobrar } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §12.7 — Cuentas por cobrar.
 * R-R-08 saldo por cliente con antigüedad 0-30 / 31-60 / 61-90 / 90+.
 * Solo ADMIN (§13).
 */
@Component({
  selector: 'app-reporte-cuentas-por-cobrar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './reporte-cuentas-por-cobrar.component.html',
  styleUrl: './reporte-cuentas-por-cobrar.component.scss',
})
export class ReporteCuentasPorCobrarComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly columnas = [
    'nombre',
    'saldoTotal',
    'dias30',
    'dias60',
    'dias90',
    'creditLimit',
    'disponible',
    'ultimoPago',
  ];

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteCuentasPorCobrar | null>(null);

  readonly clientes = computed(() => {
    const filas = this.reporte()?.clientes ?? [];
    const orden = this.ordenLocal();
    if (!orden?.direction) return filas;
    return ordenarFilas(filas, orden);
  });

  /** Ordenamiento local sobre `matSort`; `null` = orden del servidor. */
  readonly ordenLocal = signal<Sort | null>(null);

  readonly antiguedadVacia = computed(
    () => this.clientes().reduce((suma, c) => suma + c.antiguedad.dias90, 0),
  );

  readonly enCarteraVigente = computed(
    () => this.clientes().reduce((suma, c) => suma + c.antiguedad.dias30 + c.antiguedad.dias60, 0),
  );

  /** Clientes cuyo uso del cupo pasó el 90%. */
  readonly alLimite = computed(() =>
    this.clientes()
      .filter((c) => c.creditLimit > 0 && c.saldoTotal / c.creditLimit >= 0.9)
      .sort((a, b) => b.saldoTotal / b.creditLimit - a.saldoTotal / a.creditLimit),
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.cuentasPorCobrar().subscribe({
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

  ordenar(sort: Sort): void {
    this.ordenLocal.set(sort.direction ? sort : null);
  }

  usoCupo(creditLimit: number, saldo: number): number {
    if (creditLimit <= 0) return 100;
    return (saldo / creditLimit) * 100;
  }

  etiquetaAntiguedad(dias90: number): { texto: string; tipo: 'ok' | 'warn' | 'error' } {
    if (dias90 > 0) return { texto: 'Más de 90 días', tipo: 'error' };
    return { texto: 'Dentro de plazo', tipo: 'ok' };
  }
}

/** Ordenamiento genérico por la columna activa de `matSort`. */
function ordenarFilas<T extends object>(filas: T[], sort: Sort): T[] {
  const clave = sort.active as keyof T;
  return [...filas].sort((a, b) => {
    const va = a[clave];
    const vb = b[clave];
    const resultado =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
    return sort.direction === 'asc' ? resultado : -resultado;
  });
}