import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TipoMovimientoStock } from '../../core/enums';
import { MovimientoKardex, StockProducto } from '../../core/models/inventario.model';
import { InventarioService } from '../../core/services/inventario.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { RangoFechasComponent, hoy } from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * `GET /api/inventario/kardex/{productoId}` — ESQUEMA_API.md §7.1
 * R-I-02 todo cambio de stock genera un movimiento · R-I-05 los movimientos no se borran.
 */
@Component({
  selector: 'app-kardex',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    RangoFechasComponent,
    MonedaPipe,
    EnteroPipe,
    FechaPipe,
  ],
  templateUrl: './kardex.component.html',
  styleUrl: './kardex.component.scss',
})
export class KardexComponent {
  private readonly inventario = inject(InventarioService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  /** Bound desde la ruta `/inventario/kardex/:id`. */
  readonly id = input.required<string>();

  readonly TipoMovimientoStock = TipoMovimientoStock;

  readonly cargando = signal(true);
  readonly movimientos = signal<MovimientoKardex[]>([]);
  readonly stock = signal<StockProducto | null>(null);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(50);

  readonly desde = signal('');
  readonly hasta = signal('');

  readonly columnas = ['createdAt', 'type', 'lote', 'qty', 'unitCost', 'stockResultante', 'referencia', 'usuario', 'reason'];

  /** El producto del encabezado, tomado del primer movimiento o de la consulta de stock. */
  readonly producto = computed(() => {
    const stock = this.stock();
    if (stock) return { nombre: stock.nombre, stock: stock.stock, sku: stock.sku ?? '' };
    const primero = this.movimientos()[0];
    return primero
      ? { nombre: primero.productoNombre, stock: primero.stockResultante, sku: primero.sku ?? '' }
      : null;
  });

  readonly entradas = computed(
    () => this.movimientos().filter((m) => m.qty > 0).length,
  );

  constructor() {
    queueMicrotask(() => {
      const id = Number(this.id());
      this.desde.set(inicioDeMes());
      this.hasta.set(hoy());
      this.cargar(0);
      this.cargarStock(id);
    });
  }

  private cargarStock(id: number): void {
    if (!id) return;
    this.inventario.stock(id).subscribe({
      next: (stock) => this.stock.set(stock),
      error: () => this.stock.set(null),
    });
  }

  cargar(pagina: number): void {
    const id = Number(this.id());
    if (!id) return;

    this.cargando.set(true);
    this.inventario
      .kardex(id, {
        desde: this.desde() || undefined,
        hasta: this.hasta() || undefined,
        page: pagina,
        size: this.tamano(),
      })
      .subscribe({
        next: (paginaResultado) => {
          this.movimientos.set(paginaResultado.content);
          this.total.set(paginaResultado.totalElements);
          this.pagina.set(pagina);
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
    this.cargar(0);
  }

  cambiarPagina(evento: PageEvent): void {
    this.tamano.set(evento.pageSize);
    this.cargar(evento.pageIndex);
  }

  tipoMovimiento(tipo: TipoMovimientoStock): 'ok' | 'error' | 'warn' | 'info' | 'neutro' {
    switch (tipo) {
      case TipoMovimientoStock.INVENTARIO_INICIAL:
        return 'info';
      case TipoMovimientoStock.COMPRA:
      case TipoMovimientoStock.DEVOLUCION_PROVEEDOR:
        return 'ok';
      case TipoMovimientoStock.VENTA:
      case TipoMovimientoStock.AJUSTE_NEGATIVO:
      case TipoMovimientoStock.MERMA:
        return 'error';
      case TipoMovimientoStock.AJUSTE_POSITIVO:
        return 'warn';
      default:
        return 'neutro';
    }
  }

  volver(): void {
    void this.router.navigate(['/inventario']);
  }
}

function inicioDeMes(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
}