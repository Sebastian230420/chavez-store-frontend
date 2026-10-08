import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Rol } from '../../core/enums';
import { Abono, ClienteDetalle } from '../../core/models/cliente.model';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { formatearFecha, formatearMoneda } from '../../shared/utils/formato';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { AbonoDialogComponent } from './abono-dialog.component';
import { LimiteCreditoDialogComponent } from './limite-credito-dialog.component';

/**
 * `GET /api/clientes/{id}/detalle` — ESQUEMA_API.md §11.2
 * Muestra saldo, disponible, ventas de los últimos 30 días e historial de abonos.
 */
@Component({
  selector: 'app-cliente-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './cliente-detalle.component.html',
  styleUrl: './cliente-detalle.component.scss',
})
export class ClienteDetalleComponent {
  private readonly clientesService = inject(ClienteService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly id = input.required<string>();
  readonly Rol = Rol;

  readonly cargando = signal(true);
  readonly cliente = signal<ClienteDetalle | null>(null);

  readonly abonos = signal<Abono[]>([]);
  readonly cargandoAbonos = signal(true);
  readonly paginaAbonos = signal(0);
  readonly totalAbonos = signal(0);
  readonly columnasAbonos = ['fecha', 'amount', 'method', 'appliedSaleId', 'registradoPor', 'estado', 'acciones'];

  readonly saldo = computed(() => Number(this.cliente()?.saldoActual ?? 0));
  readonly disponible = computed(() => Number(this.cliente()?.disponible ?? 0));
  readonly usoCupo = computed(() => {
    const cliente = this.cliente();
    if (!cliente || Number(cliente.creditLimit) <= 0) return 0;
    return (this.saldo() / Number(cliente.creditLimit)) * 100;
  });

  readonly puedeAbonar = this.auth.tieneRol(Rol.ADMIN, Rol.CAJERO);
  readonly puedeEditarCredito = this.auth.tieneRol(Rol.ADMIN);

  constructor() {
    queueMicrotask(() => {
      this.cargar(Number(this.id()));
      this.cargarAbonos(0);
    });
  }

  cargar(id: number): void {
    if (!id) return;
    this.cargando.set(true);
    this.clientesService.detalle(id).subscribe({
      next: (cliente) => {
        this.cliente.set(cliente);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
        void this.router.navigate(['/clientes']);
      },
    });
  }

  cargarAbonos(pagina: number): void {
    const id = Number(this.id());
    if (!id) return;

    this.cargandoAbonos.set(true);
    this.clientesService.listarAbonos(id, pagina, 20).subscribe({
      next: (resultado) => {
        this.abonos.set(resultado.content);
        this.totalAbonos.set(resultado.totalElements);
        this.paginaAbonos.set(pagina);
        this.cargandoAbonos.set(false);
      },
      error: (err: unknown) => {
        this.cargandoAbonos.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cambiarPaginaAbonos(evento: PageEvent): void {
    this.cargarAbonos(evento.pageIndex);
  }

  registrarAbono(): void {
    const cliente = this.cliente();
    if (!cliente) return;

    this.dialog
      .open(AbonoDialogComponent, { width: '600px', maxWidth: '94vw', data: cliente })
      .afterClosed()
      .subscribe((abono?: Abono | null) => {
        if (!abono) return;
        const id = Number(this.id());
        this.cargar(id);
        this.cargarAbonos(this.paginaAbonos());
      });
  }

  editarLimite(): void {
    const cliente = this.cliente();
    if (!cliente) return;

    this.dialog
      .open(LimiteCreditoDialogComponent, { width: '460px', maxWidth: '94vw', data: cliente })
      .afterClosed()
      .subscribe((actualizado?: ClienteDetalle | null) => {
        if (actualizado) this.cargar(Number(this.id()));
      });
  }

  /** R-CL-09: solo ADMIN. El saldo del cliente vuelve a aumentar. */
  anularAbono(abono: Abono): void {
    const cliente = this.cliente();
    if (!cliente) return;

    const monto = formatearMoneda(abono.amount);
    const fecha = formatearFecha(abono.fecha ?? abono.createdAt ?? null);

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '480px',
        data: {
          titulo: 'Anular abono',
          mensaje: `¿Anular el abono de ${monto}${fecha ? ` del ${fecha}` : ''}?`,
          advertencia: 'El saldo del cliente volverá a aumentar y el abono quedará registrado.',
          confirmar: 'Anular abono',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.clientesService.anularAbono(cliente.id, abono.id).subscribe({
          next: () => {
            this.notificacion.exito('Abono anulado');
            this.cargar(cliente.id);
            this.cargarAbonos(this.paginaAbonos());
          },
          error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
        });
      });
  }

  volver(): void {
    void this.router.navigate(['/clientes']);
  }
}