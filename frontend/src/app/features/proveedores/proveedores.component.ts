import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { Rol } from '../../core/enums';
import { Proveedor } from '../../core/models/proveedor.model';
import { AuthService } from '../../core/services/auth.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { ProveedorFormDialogComponent } from './proveedor-form-dialog.component';

/** ESQUEMA_API.md §8 — ADMIN | ALMACENERO gestionan proveedores. */
@Component({
  selector: 'app-proveedores',
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
  ],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent {
  private readonly proveedoresService = inject(ProveedorService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly Rol = Rol;

  readonly cargando = signal(true);
  readonly filas = signal<Proveedor[]>([]);
  readonly columnas = ['document', 'name', 'contacto', 'address', 'active', 'acciones'];

  readonly search = signal('');
  readonly soloActivos = signal(false);

  readonly puedeEditar = this.auth.tieneRol(Rol.ADMIN, Rol.ALMACENERO);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.proveedoresService.listar(this.search() || undefined, this.soloActivos() ? true : undefined).subscribe({
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

  alternarActivos(): void {
    this.soloActivos.update((v) => !v);
    this.cargar();
  }

  abrirFormulario(proveedor?: Proveedor): void {
    this.dialog
      .open(ProveedorFormDialogComponent, {
        width: '620px',
        maxWidth: '94vw',
        data: proveedor ?? null,
      })
      .afterClosed()
      .subscribe((guardado?: Proveedor | null) => {
        if (guardado) this.cargar();
      });
  }

  desactivar(proveedor: Proveedor): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '470px',
        data: {
          titulo: 'Desactivar proveedor',
          mensaje: `¿Desactivar a «${proveedor.name}»?`,
          advertencia: 'R-CO-09: un proveedor inactivo no puede recibir compras nuevas.',
          confirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.proveedoresService.desactivar(proveedor.id).subscribe({
          next: () => {
            this.notificacion.exito('Proveedor desactivado');
            this.cargar();
          },
          error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
        });
      });
  }
}