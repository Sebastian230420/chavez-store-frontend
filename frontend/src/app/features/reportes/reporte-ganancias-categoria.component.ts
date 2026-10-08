import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Categoria } from '../../core/models/catalogo.model';
import { ReporteGananciasCategoria } from '../../core/models/reporte.model';
import { CategoriaService } from '../../core/services/categoria.service';
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
 * ESQUEMA_API.md §12.2 — Ganancia por categoría.
 * R-R-04 agrupa por `products.category_id`.
 * R-R-05 margen % = utilidad / ingresos × 100. Si ingresos = 0, margen = 0.
 *
 * La distinción clave del dominio (LOGICA_NEGOCIO.md §2.5) es que aquí se ve
 * el margen **teórico** (lo que el precio promete) contra el **real** (descontando
 * la merma). Un producto con 25% teórico y 12% de merma tiene 13% real.
 */
@Component({
  selector: 'app-reporte-ganancias-categoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    RangoFechasComponent,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
  ],
  templateUrl: './reporte-ganancias-categoria.component.html',
  styleUrl: './reporte-ganancias-categoria.component.scss',
})
export class ReporteGananciasCategoriaComponent {
  private readonly reportes = inject(ReporteService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly notificacion = inject(NotificacionService);

  readonly columnas = [
    'categoriaNombre',
    'ventasCount',
    'unidadesVendidas',
    'litrosVendidos',
    'ingresos',
    'costoVentas',
    'mermas',
    'utilidad',
    'margenPct',
    'margenRealPct',
    'participacionIngresosPct',
  ];

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteGananciasCategoria | null>(null);
  readonly categorias = signal<Categoria[]>([]);

  readonly desde = signal(rangoMesActual().desde);
  readonly hasta = signal(rangoMesActual().hasta);

  readonly datos = computed(() => {
    const filas = this.reporte()?.categorias ?? [];
    const orden = this.ordenLocal();
    if (!orden?.direction) return filas;
    return ordenarFilas(filas, orden);
  });

  /** Ordenamiento local sobre `matSort`. */
  readonly ordenLocal = signal<Sort | null>(null);

  readonly totales = computed(() => {
    const filas = this.datos();
    const ingresos = filas.reduce((s, c) => s + c.ingresos, 0);
    const utilidad = filas.reduce((s, c) => s + c.utilidad, 0);
    return {
      ingresos,
      mermas: filas.reduce((s, c) => s + c.mermas, 0),
      utilidad,
      margenPct: ingresos > 0 ? (utilidad / ingresos) * 100 : 0,
    };
  });

  /** Categorías donde la merma se come el margen prometido. */
  readonly conMermaRelevante = computed(() =>
    this.datos()
      .filter((c) => c.ingresos > 0 && c.margenPct - c.margenRealPct >= 2)
      .sort((a, b) => b.margenPct - b.margenRealPct - (a.margenPct - a.margenRealPct)),
  );

  constructor() {
    this.categoriasService.listar().subscribe({
      next: (lista) => this.categorias.set(lista),
      error: () => this.categorias.set([]),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.gananciasPorCategoria(this.desde(), this.hasta()).subscribe({
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

  ordenar(sort: Sort): void {
    this.ordenLocal.set(sort.direction ? sort : null);
  }

  /** Pérdida de margen por merma, en puntos porcentuales. */
  brechaMerma(teorico: number, real: number): number {
    return teorico - real;
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