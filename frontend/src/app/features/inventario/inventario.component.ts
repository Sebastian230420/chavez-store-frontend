import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { EstadoStock, Rol } from '../../core/enums';
import { Producto } from '../../core/models/producto.model';
import { AuthService } from '../../core/services/auth.service';
import { ProductoService } from '../../core/services/producto.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { MermaDialogComponent } from './merma-dialog.component';
import { AjusteDialogComponent } from './ajuste-dialog.component';
import { VerificarInvarianteComponent } from './verificar-invariante.component';

/**
 * Vista operativa del inventario: stock en unidad base, estado y acciones.
 * El stock mostrado es el caché de `products`; el kardex es la fuente de verdad (R-I-03).
 */
@Component({
  selector: 'app-inventario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.scss',
})
export class InventarioComponent {
  private readonly productosService = inject(ProductoService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly Rol = Rol;

  readonly cargando = signal(true);
  readonly filas = signal<Producto[]>([]);

  readonly columnas = ['sku', 'nombre', 'stock', 'estado', 'lotesPorVencer', 'costo', 'acciones'];

  readonly search = signal('');
  readonly soloCriticos = signal(false);

  readonly puedeAjustar = this.auth.tieneRol(Rol.ADMIN, Rol.SUPERVISOR);
  readonly puedeVerificar = this.auth.tieneRol(Rol.ADMIN);

  readonly criticos = computed(() => this.filas().filter((p) => estadoDe(p) !== EstadoStock.NORMAL));
  readonly agotados = computed(() => this.filas().filter((p) => p.stock <= 0));

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.productosService
      .listarTodos({
        search: this.search() || undefined,
        stockBajo: this.soloCriticos() || undefined,
      })
      .subscribe({
        next: (lista) => {
          this.filas.set(lista);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.notificacion.error(mensajeDeError(err));
        },
      });
  }

  buscar(): void {
    this.cargar();
  }

  alternarCriticos(): void {
    this.soloCriticos.update((v) => !v);
    this.cargar();
  }

  estadoDe(producto: Producto): EstadoStock {
    if (producto.stock <= 0) return EstadoStock.AGOTADO;
    if (producto.stock <= producto.minStock) return EstadoStock.CRITICO;
    return EstadoStock.NORMAL;
  }

  totalPorVencer(producto: Producto): number {
    return producto.lotesPorVencer?.reduce((suma, l) => suma + l.qtyRemaining, 0) ?? 0;
  }

  abrirKardex(producto: Producto): void {
    void this.router.navigate(['/inventario/kardex', producto.id]);
  }

  registrarMerma(producto: Producto): void {
    this.dialog
      .open(MermaDialogComponent, { width: '620px', maxWidth: '94vw', data: producto })
      .afterClosed()
      .subscribe((hecho?: boolean) => {
        if (hecho) this.cargar();
      });
  }

  ajustar(producto: Producto): void {
    this.dialog
      .open(AjusteDialogComponent, { width: '600px', maxWidth: '94vw', data: producto })
      .afterClosed()
      .subscribe((hecho?: boolean) => {
        if (hecho) this.cargar();
      });
  }

  verificarInvariante(): void {
    this.dialog.open(VerificarInvarianteComponent, { width: '760px', maxWidth: '96vw' });
  }
}

/** R-I-09: alerta de stock crítico; `stock == 0` no bloquea el registro (R-V-07). */
function estadoDe(producto: Producto): EstadoStock {
  if (producto.stock <= 0) return EstadoStock.AGOTADO;
  if (producto.stock <= producto.minStock) return EstadoStock.CRITICO;
  return EstadoStock.NORMAL;
}