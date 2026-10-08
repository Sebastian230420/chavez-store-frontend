import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { EstadoVenta, Rol, TipoVenta } from '../../core/enums';
import { Cliente } from '../../core/models/cliente.model';
import { Venta } from '../../core/models/venta.model';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { VentaService } from '../../core/services/venta.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { RangoFechasComponent, hoy } from '../../shared/components/rango-fechas.component';
import { MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** ESQUEMA_API.md §10.3 */
@Component({
  selector: 'app-ventas',
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
    MatProgressBarModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    RangoFechasComponent,
    MonedaPipe,
    FechaPipe,
  ],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.scss',
})
export class VentasComponent {
  private readonly ventasService = inject(VentaService);
  private readonly clientesService = inject(ClienteService);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);

  readonly Rol = Rol;
  readonly tiposVenta = Object.values(TipoVenta);
  readonly estadosVenta = Object.values(EstadoVenta);

  readonly cargando = signal(true);
  readonly filas = signal<Venta[]>([]);
  readonly clientes = signal<Cliente[]>([]);

  readonly columnas = ['document', 'fecha', 'tipo', 'cliente', 'items', 'total', 'profit', 'status', 'acciones'];

  readonly desde = signal(hoy());
  readonly hasta = signal(hoy());
  readonly tipo = signal<TipoVenta | null>(null);
  readonly estado = signal<EstadoVenta | null>(null);
  readonly clienteId = signal<number | null>(null);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly total = signal(0);

  readonly puedeRegistrar = this.auth.tieneRol(Rol.ADMIN, Rol.CAJERO);

  constructor() {
    this.clientesService.listar({ active: true }).subscribe({
      next: (lista) => this.clientes.set(lista),
      error: () => this.clientes.set([]),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.ventasService
      .listar({
        type: this.tipo(),
        status: this.estado(),
        clienteId: this.clienteId(),
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

  cambiarTipo(valor: TipoVenta | null): void {
    this.tipo.set(valor);
    this.buscar();
  }

  cambiarEstado(valor: EstadoVenta | null): void {
    this.estado.set(valor);
    this.buscar();
  }

  cambiarCliente(valor: number | null): void {
    this.clienteId.set(valor);
    this.buscar();
  }

  limpiar(): void {
    const hoyFecha = hoy();
    this.desde.set(hoyFecha);
    this.hasta.set(hoyFecha);
    this.tipo.set(null);
    this.estado.set(null);
    this.clienteId.set(null);
    this.buscar();
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  ver(venta: Venta): void {
    void this.router.navigate(['/ventas', venta.id]);
  }

  cantidadItems(venta: Venta): number {
    return venta.detalles?.length ?? 0;
  }
}