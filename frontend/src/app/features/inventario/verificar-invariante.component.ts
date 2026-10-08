import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { VerificacionInventario } from '../../core/models/inventario.model';
import { InventarioService } from '../../core/services/inventario.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { EnteroPipe } from '../../shared/pipes/formato.pipe';

/**
 * `GET /api/inventario/verificar` — ESQUEMA_API.md §7.5
 * R-I-04: `products.stock == SUM(stock_movements.qty)`.
 * Es una alerta de auditoría: el sistema nunca "corrige" el caché en silencio.
 */
@Component({
  selector: 'app-verificar-invariante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    EmptyStateComponent,
    EnteroPipe,
  ],
  template: `
    <h2 mat-dialog-title>Verificación del inventario</h2>
    <mat-dialog-content>
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (resultado(); as r) {
        <div class="cs-estado" [class.cs-estado--ok]="r.verificado">
          <mat-icon>{{ r.verificado ? 'verified' : 'report_problem' }}</mat-icon>
          <div>
            <strong>
              {{ r.verificado ? 'El inventario cuadra' : 'Hay descuadres de inventario' }}
            </strong>
            <span>
              @if (r.verificado) {
                El stock cacheado de cada producto coincide con la suma de sus movimientos.
              } @else {
                {{ r.productosConDescuadre.length }} producto(s) con diferencia entre el
                stock cacheado y sus movimientos.
              }
            </span>
          </div>
        </div>

        @if (r.productosConDescuadre.length) {
          <table mat-table [dataSource]="r.productosConDescuadre" class="cs-tabla">
            <ng-container matColumnDef="sku">
              <th mat-header-cell *matHeaderCellDef>SKU</th>
              <td mat-cell *matCellDef="let fila" class="cs-mono">{{ fila.sku }}</td>
            </ng-container>
            <ng-container matColumnDef="stockCacheado">
              <th mat-header-cell *matHeaderCellDef class="cs-num">Stock cacheado</th>
              <td mat-cell *matCellDef="let fila" class="cs-num">{{ fila.stockCacheado | entero }}</td>
            </ng-container>
            <ng-container matColumnDef="stockReal">
              <th mat-header-cell *matHeaderCellDef class="cs-num">Suma de movimientos</th>
              <td mat-cell *matCellDef="let fila" class="cs-num">{{ fila.stockReal | entero }}</td>
            </ng-container>
            <ng-container matColumnDef="diferencia">
              <th mat-header-cell *matHeaderCellDef class="cs-num">Diferencia</th>
              <td mat-cell *matCellDef="let fila" class="cs-num cs-error">
                {{ fila.diferencia > 0 ? '+' : '' }}{{ fila.diferencia | entero }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columnas"></tr>
            <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
          </table>

          <p class="cs-nota">
            <mat-icon inline>warning</mat-icon>
            Para corregir un descuadre, registra un ajuste manual con motivo.
            Los movimientos del kardex nunca se borran.
          </p>
        }
      } @else if (!cargando()) {
        <app-empty-state icono="inventory" titulo="Sin resultado" />
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cerrar</button>
      <button mat-flat-button type="button" [disabled]="cargando()" (click)="verificar()">
        <mat-icon>refresh</mat-icon>
        Volver a verificar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cs-estado {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 10px;
        background: var(--cs-error-bg);
        color: var(--cs-error);
        border: 1px solid #f2c7c1;
      }
      .cs-estado--ok {
        background: var(--cs-ok-bg);
        color: var(--cs-ok);
        border-color: #bfe3cf;
      }
      .cs-estado div {
        display: flex;
        flex-direction: column;
      }
      .cs-estado strong {
        font-size: 14px;
      }
      .cs-estado span {
        font-size: 12.5px;
      }
      .cs-nota {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 14px 0 0;
        padding: 9px 12px;
        border-radius: 8px;
        background: #f3f5f7;
        color: var(--cs-texto-suave);
        font-size: 12.5px;
      }
    `,
  ],
})
export class VerificarInvarianteComponent {
  private readonly inventario = inject(InventarioService);
  private readonly dialogRef = inject(MatDialogRef<VerificarInvarianteComponent>);
  private readonly notificacion = inject(NotificacionService);

  readonly columnas = ['sku', 'stockCacheado', 'stockReal', 'diferencia'];

  readonly cargando = signal(true);
  readonly resultado = signal<VerificacionInventario | null>(null);

  constructor() {
    this.verificar();
  }

  verificar(): void {
    this.cargando.set(true);
    this.inventario.verificarInvariante().subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}