import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Categoria } from '../../core/models/catalogo.model';
import {
  OrdenReporteProducto,
  ReporteGananciasProducto,
} from '../../core/models/reporte.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import {
  RangoFechasComponent,
  rangoMesActual,
} from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe, NumeroPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §12.3 — Ganancia por producto.
 * R-R-10 incluye productos sin movimiento: `ventas = 0` y `diasSinVenta > 0`.
 */
@Component({
  selector: 'app-reporte-ganancias-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    RangoFechasComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    KpiCardComponent,
    MonedaPipe,
    EnteroPipe,
    NumeroPipe,
    PorcentajePipe,
  ],
  templateUrl: './reporte-ganancias-producto.component.html',
  styleUrl: './reporte-ganancias-producto.component.scss',
})
export class ReporteGananciasProductoComponent {
  private readonly reportes = inject(ReporteService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly notificacion = inject(NotificacionService);

  readonly columnas = [
    'nombre',
    'unidadesVendidas',
    'ingresos',
    'costo',
    'mermas',
    'utilidad',
    'margenRealPct',
    'stockActual',
    'rotacion',
    'diasSinVenta',
  ];

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteGananciasProducto | null>(null);
  readonly categorias = signal<Categoria[]>([]);

  readonly desde = signal(rangoMesActual().desde);
  readonly hasta = signal(rangoMesActual().hasta);
  readonly categoriaId = signal<number | null>(null);
  readonly orden = signal<OrdenReporteProducto>('utilidad');
  readonly limite = signal(50);
  readonly busqueda = signal('');

  readonly ordenes = this.reportes.ordenesProducto;
  readonly datos = computed(() => this.reporte()?.productos ?? []);
  readonly totalProductos = computed(() => this.reporte()?.totalProductos ?? 0);

  /** Filtro de texto en cliente: la API no expone búsqueda por nombre aquí. */
  readonly datosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    let filas = this.datos();
    if (texto) {
      filas = filas.filter(
        (p) => p.nombre.toLowerCase().includes(texto) || p.sku.toLowerCase().includes(texto),
      );
    }
    const orden = this.ordenLocal();
    return orden?.direction ? ordenarFilas(filas, orden) : filas;
  });

  /** Ordenamiento local sobre `matSort`. */
  readonly ordenLocal = signal<Sort | null>(null);

  /** R-R-10: producto quieto 30+ días, candidato a compra o a descuento. */
  readonly sinVentaReciente = computed(() =>
    this.datos().filter((p) => p.unidadesVendidas === 0 && p.diasSinVenta >= 30),
  );

  readonly conMerma = computed(() => this.datos().filter((p) => p.mermas > 0));

  constructor() {
    this.categoriasService.listar().subscribe({
      next: (lista) => this.categorias.set(lista),
      error: () => this.categorias.set([]),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes
      .gananciasPorProducto({
        desde: this.desde(),
        hasta: this.hasta(),
        categoriaId: this.categoriaId(),
        orden: this.orden(),
        limite: this.limite(),
      })
      .subscribe({
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

  cambiarCategoria(valor: number | null): void {
    this.categoriaId.set(valor);
    this.cargar();
  }

  cambiarOrden(valor: OrdenReporteProducto): void {
    this.orden.set(valor);
    this.cargar();
  }

  cambiarLimite(valor: number): void {
    this.limite.set(valor);
    this.cargar();
  }

  ordenar(sort: Sort): void {
    this.ordenLocal.set(sort.direction ? sort : null);
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