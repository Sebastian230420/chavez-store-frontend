import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Rol } from '../../core/enums';
import { Marca } from '../../core/models/catalogo.model';
import { AuthService } from '../../core/services/auth.service';
import { MarcaService } from '../../core/services/marca.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { MarcaFormDialogComponent } from './marca-form-dialog.component';

/** ESQUEMA_API.md §4 */
@Component({
  selector: 'app-marcas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
  ],
  templateUrl: './marcas.component.html',
})
export class MarcasComponent {
  private readonly marcas = inject(MarcaService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly datos = signal<Marca[]>([]);

  readonly columnas = ['id', 'name', 'active', 'acciones'];
  readonly puedeEditar = this.auth.tieneRol(Rol.ADMIN);

  /** Expuesto al template para `*appPermiso="Rol.ADMIN"`. */
  readonly Rol = Rol;

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.marcas.listar().subscribe({
      next: (lista) => {
        this.datos.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  abrirFormulario(marca?: Marca): void {
    this.dialog
      .open(MarcaFormDialogComponent, { width: '440px', maxWidth: '94vw', data: marca ?? null })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  desactivar(marca: Marca): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          titulo: 'Desactivar marca',
          mensaje: `¿Desactivar «${marca.name}»?`,
          advertencia: 'No se elimina: deja de estar disponible para nuevos productos.',
          confirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.marcas.desactivar(marca.id).subscribe({
          next: () => {
            this.notificacion.exito('Marca desactivada');
            this.cargar();
          },
          error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
        });
      });
  }
}