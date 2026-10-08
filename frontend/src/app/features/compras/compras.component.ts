import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { EstadoCompra, Rol } from '../../core/enums';
import { Compra } from '../../core/models/compra.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { AuthService } from '../../core/services/auth.service';
import { CompraService } from '../../core/services/compra.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { RangoFechasComponent, hoy } from '../../shared/components/rango-fechas.component';
import { MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** ESQUEMA_API.md §9.1 */
@Component({
  selector: 'app-compras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    RangoFechasComponent,
    MonedaPipe,
    FechaPipe,
  ],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss',
})
export class ComprasComponent {
  private readonly comprasService = inject(CompraService);
  private readonly proveedoresService = inject(ProveedorService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly Rol = Rol;
  readonly estados = Object.values(EstadoCompra);

  readonly cargando = signal(true);
  readonly filas = signal<Compra[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);

  readonly columnas = ['document', 'issueDate', 'proveedor', 'items', 'total', 'status', 'acciones'];

  readonly desde = signal(hoy());
  readonly hasta = signal(hoy());
  readonly estado = signal<EstadoCompra | null>(null);
  readonly proveedorId = signal<number | null>(null);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly total = signal(0);

  readonly puedeGestionar = this.auth.tieneRol(Rol.ADMIN, Rol.ALMACENERO);

  constructor() {
    this.proveedoresService.listar().subscribe({
      next: (lista) => this.proveedores.set(lista),
      error: () => this.proveedores.set([]),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.comprasService
      .listar({
        status: this.estado(),
        proveedorId: this.proveedorId(),
        desde: this.desde(),
        hasta: this.hasta(),
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

  cambiarRango(rango: { desde: string; hasta: string }): void {
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);
    this.buscar();
  }

  cambiarEstado(valor: EstadoCompra | null): void {
    this.estado.set(valor);
    this.buscar();
  }

  cambiarProveedor(valor: number | null): void {
    this.proveedorId.set(valor);
    this.buscar();
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  ver(compra: Compra): void {
    void this.router.navigate(['/compras', compra.id]);
  }

  cantidadItems(compra: Compra): number {
    return compra.detalles?.length ?? 0;
  }
}