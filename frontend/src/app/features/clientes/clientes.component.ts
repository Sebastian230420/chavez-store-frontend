import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Rol, TipoCliente } from '../../core/enums';
import { Cliente } from '../../core/models/cliente.model';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import { AbonoDialogComponent } from './abono-dialog.component';

/** ESQUEMA_API.md §11.1 */
@Component({
  selector: 'app-clientes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    PorcentajePipe,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent {
  private readonly clientesService = inject(ClienteService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);

  readonly Rol = Rol;
  readonly tipos = Object.values(TipoCliente);

  readonly cargando = signal(true);
  readonly filas = signal<Cliente[]>([]);

  readonly columnas = ['document', 'fullName', 'type', 'contacto', 'creditLimit', 'saldo', 'disponible', 'active', 'acciones'];

  readonly search = signal('');
  readonly tipo = signal<TipoCliente | null>(null);
  readonly soloActivos = signal(true);

  readonly puedeEditar = this.auth.tieneRol(Rol.ADMIN, Rol.CAJERO);
  readonly puedeAbonar = this.auth.tieneRol(Rol.ADMIN, Rol.CAJERO);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.clientesService
      .listar({
        search: this.search() || undefined,
        type: this.tipo(),
        active: this.soloActivos() ? true : null,
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

  cambiarTipo(valor: TipoCliente | null): void {
    this.tipo.set(valor);
    this.cargar();
  }

  limpiar(): void {
    this.search.set('');
    this.tipo.set(null);
    this.soloActivos.set(true);
    this.cargar();
  }

  abrirFormulario(cliente?: Cliente): void {
    this.dialog
      .open(ClienteFormDialogComponent, {
        width: '640px',
        maxWidth: '94vw',
        data: cliente ?? null,
      })
      .afterClosed()
      .subscribe((guardado?: Cliente | null) => {
        if (guardado) this.cargar();
      });
  }

  registrarAbono(cliente: Cliente): void {
    this.dialog
      .open(AbonoDialogComponent, { width: '600px', maxWidth: '94vw', data: cliente })
      .afterClosed()
      .subscribe((abono?: unknown) => {
        if (abono) this.cargar();
      });
  }

  verDetalle(cliente: Cliente): void {
    void this.router.navigate(['/clientes', cliente.id]);
  }

  /** R-CL-08: con deuda pendiente solo se desactiva, nunca se elimina (CLI_002). */
  desactivar(cliente: Cliente): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '470px',
        data: {
          titulo: 'Desactivar cliente',
          mensaje: `¿Desactivar a «${cliente.fullName}»?`,
          advertencia:
            'No se elimina el historial. Si el cliente tiene saldo pendiente, el servidor lo rechazará con CLI_002 y seguirá activo.',
          confirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.clientesService.desactivar(cliente.id).subscribe({
          next: () => {
            this.notificacion.exito('Cliente desactivado');
            this.cargar();
          },
          error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
        });
      });
  }

  /** Porcentaje de cupo usado, para colorear la celda. */
  usoCupo(cliente: Cliente): number {
    const limite = Number(cliente.creditLimit ?? 0);
    if (limite <= 0) return 100;
    return (Number(cliente.saldoActual ?? 0) / limite) * 100;
  }
}