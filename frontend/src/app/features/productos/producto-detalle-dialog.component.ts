import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Rol, TipoPresentacion } from '../../core/enums';
import { Producto } from '../../core/models/producto.model';
import { AuthService } from '../../core/services/auth.service';
import { ProductoService } from '../../core/services/producto.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PermisoDirective } from '../../shared/directives/permiso.directive';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { PresentacionFormDialogComponent } from './presentacion-form-dialog.component';

/**
 * Ficha del producto: presentaciones (R-C-04/R-C-06) y lotes por vencer (R-I-10).
 * El `stock` mostrado es el caché; el kardex es la fuente de verdad (R-I-03).
 */
@Component({
  selector: 'app-producto-detalle-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,
    EmptyStateComponent,
    EstadoChipComponent,
    PermisoDirective,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './producto-detalle-dialog.component.html',
  styleUrl: './producto-detalle-dialog.component.scss',
})
export class ProductoDetalleDialogComponent {
  private readonly productosService = inject(ProductoService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<ProductoDetalleDialogComponent>);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly original = inject<Producto>(MAT_DIALOG_DATA);

  readonly producto = signal<Producto>(this.original);
  readonly columnasPresentacion = ['name', 'type', 'unitsBase', 'price', 'stockMin', 'acciones'];
  readonly puedeEditarPresentacion = this.auth.tieneRol(Rol.ADMIN);

  /** Expuestos al template para la directiva de permisos y el tipo de presentación. */
  readonly Rol = Rol;
  readonly TipoPresentacion = TipoPresentacion;

  recargar(): void {
    this.productosService.obtener(this.original.id).subscribe({
      next: (p) => this.producto.set(p),
      error: (err: unknown) => this.notificacion.error(mensajeDeError(err)),
    });
  }

  editarPresentacion(presentacionId: number): void {
    const producto = this.producto();
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
        if (guardado) this.recargar();
      });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}