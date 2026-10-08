import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Categoria } from '../../core/models/catalogo.model';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { Rol } from '../../core/enums';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { CategoriaFormDialogComponent } from './categoria-form-dialog.component';

/** ESQUEMA_API.md §3 — categorías: cualquier usuario las ve, ADMIN las edita. */
@Component({
  selector: 'app-categorias',
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
  templateUrl: './categorias.component.html',
})
export class CategoriasComponent {
  private readonly categorias = inject(CategoriaService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly datos = signal<Categoria[]>([]);

  readonly columnas = ['id', 'name', 'description', 'active', 'acciones'];
  readonly puedeEditar = this.auth.tieneRol(Rol.ADMIN);

  /** Expuesto al template para `*appPermiso="Rol.ADMIN"`. */
  readonly Rol = Rol;

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.categorias.listar().subscribe({
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

  abrirFormulario(categoria?: Categoria): void {
    this.dialog
      .open(CategoriaFormDialogComponent, { width: '480px', maxWidth: '94vw', data: categoria ?? null })
      .afterClosed()
      .subscribe((guardado?: boolean) => {
        if (guardado) this.cargar();
      });
  }

  desactivar(categoria: Categoria): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          titulo: 'Desactivar categoría',
          mensaje: `¿Desactivar «${categoria.name}»?`,
          advertencia: 'No se elimina: deja de estar disponible para nuevos productos.',
          confirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.categorias.desactivar(categoria.id).subscribe({
          next: () => {
            this.notificacion.exito('Categoría desactivada');
            this.cargar();
          },
          error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
        });
      });
  }
}