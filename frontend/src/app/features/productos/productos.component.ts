import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Rol, TipoPresentacion } from '../../core/enums';
import { Categoria, Marca } from '../../core/models/catalogo.model';
import { Producto } from '../../core/models/producto.model';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { MarcaService } from '../../core/services/marca.service';
import { ProductoService } from '../../core/services/producto.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { MonedaPipe, EnteroPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { codigoDeError, mensajeDeError } from '../../core/interceptors/error.interceptor';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';
import { PresentacionFormDialogComponent } from './presentacion-form-dialog.component';
import { StockInicialDialogComponent } from './stock-inicial-dialog.component';
import { ProductoDetalleDialogComponent } from './producto-detalle-dialog.component';

/** ESQUEMA_API.md §5.1 */
@Component({
  selector: 'app-productos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss',
})
export class ProductosComponent {
  private readonly productosService = inject(ProductoService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly marcasService = inject(MarcaService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly filas = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly marcas = signal<Marca[]>([]);

  readonly columnas = ['sku', 'nombre', 'categoria', 'presentaciones', 'stock', 'costo', 'margen', 'estado', 'acciones'];

  readonly search = signal('');
  readonly categoriaId = signal<number | null>(null);
  readonly marcaId = signal<number | null>(null);
  readonly soloStockBajo = signal(false);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly total = signal(0);

  readonly puedeEditar = this.auth.tieneRol(Rol.ADMIN, Rol.SUPERVISOR);
  readonly puedeCargarStock = this.auth.tieneRol(Rol.ADMIN, Rol.SUPERVISOR);
  readonly puedeDesactivar = this.auth.tieneRol(Rol.ADMIN);

  /** Expuesto al template para la directiva de permisos. */
  readonly Rol = Rol;

  /** R-I-09: `stock <= minStock` genera alerta. `stock == 0` no bloquea (R-V-07). */
  readonly hayStockBajo = computed(() =>
    this.filas().some((p) => p.stock > 0 && p.stock <= p.minStock),
  );

  constructor() {
    this.categoriasService.listar().subscribe((lista) => this.categorias.set(lista));
    this.marcasService.listar().subscribe((lista) => this.marcas.set(lista));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.productosService
      .listar({
        search: this.search() || undefined,
        categoriaId: this.categoriaId(),
        marcaId: this.marcaId(),
        stockBajo: this.soloStockBajo(),
        page: this.pagina(),
        size: this.tamano(),
      })
      .subscribe({
        next: (pagina) => {
          this.filas.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.notificacion.error(mensajeDeError(err));
        },
      });
  }

  buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.categoriaId.set(null);
    this.marcaId.set(null);
    this.soloStockBajo.set(false);
    this.buscar();
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  cambiarCategoria(valor: number | null): void {
    this.categoriaId.set(valor);
    this.buscar();
  }

  cambiarMarca(valor: number | null): void {
    this.marcaId.set(valor);
    this.buscar();
  }

  alternarStockBajo(): void {
    this.soloStockBajo.update((v) => !v);
    this.buscar();
  }

  /* ── Acciones ── */

  abrirFormulario(producto?: Producto): void {
    this.dialog
      .open(ProductoFormDialogComponent, {
        width: '860px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        data: producto ?? null,
      })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  verDetalle(producto: Producto): void {
    this.dialog.open(ProductoDetalleDialogComponent, {
      width: '860px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: producto,
    });
  }

  abrirPresentacion(producto: Producto): void {
    this.dialog
      .open(PresentacionFormDialogComponent, {
        width: '520px',
        maxWidth: '94vw',
        data: { productoId: producto.id, productoNombre: producto.name, presentacion: null },
      })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  editarPresentacion(producto: Producto, presentacionId: number): void {
    const presentacion = producto.presentaciones.find((p) => p.id === presentacionId);
    if (!presentacion) return;
    this.dialog
      .open(PresentacionFormDialogComponent, {
        width: '520px',
        maxWidth: '94vw',
        data: { productoId: producto.id, productoNombre: producto.name, presentacion },
      })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  cargarStock(producto: Producto): void {
    this.dialog
      .open(StockInicialDialogComponent, {
        width: '860px',
        maxWidth: '96vw',
        data: producto,
      })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  /** R-C-07: se desactiva, no se borra. `PROD_003` si tiene movimientos o ventas. */
  desactivar(producto: Producto): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '470px',
        data: {
          titulo: 'Desactivar producto',
          mensaje: `¿Desactivar «${producto.name}»?`,
          advertencia:
            'No se elimina el historial. Si el producto tiene movimientos o ventas, el servidor lo rechazará con PROD_003 y seguirá activo.',
          confirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.productosService.desactivar(producto.id).subscribe({
          next: () => {
            this.notificacion.exito('Producto desactivado');
            this.cargar();
          },
          error: (err: unknown) => {
            if (codigoDeError(err) === 'PROD_003') {
              this.notificacion.aviso('El producto tiene movimientos asociados: no se puede desactivar.');
            } else {
              this.notificacion.error(mensajeDeError(err));
            }
          },
        });
      });
  }

  /* ── Helpers de tabla ── */

  presentacionesVenta(producto: Producto) {
    return producto.presentaciones.filter((p) => p.type === TipoPresentacion.VENTA);
  }

  estadoStock(producto: Producto): 'NORMAL' | 'CRITICO' | 'AGOTADO' {
    if (producto.stock <= 0) return 'AGOTADO';
    if (producto.stock <= producto.minStock) return 'CRITICO';
    return 'NORMAL';
  }
}