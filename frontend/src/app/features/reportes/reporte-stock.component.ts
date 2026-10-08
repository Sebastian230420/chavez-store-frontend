import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReporteStock } from '../../core/models/reporte.model';
import { ReporteService } from '../../core/services/reporte.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §12.5 — Stock crítico y lotes por vencer.
 * R-R-07 los lotes por vencer son los que vencen en los próximos N días.
 * Regla operativa: si un lote vence y no hay otro vigente, el producto queda
 * bloqueado para venta (R-I-11). Por eso conviene actuar antes.
 */
@Component({
  selector: 'app-reporte-stock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    KpiCardComponent,
    EmptyStateComponent,
    EstadoChipComponent,
    MonedaPipe,
    EnteroPipe,
    FechaPipe,
  ],
  templateUrl: './reporte-stock.component.html',
  styleUrl: './reporte-stock.component.scss',
})
export class ReporteStockComponent {
  private readonly reportes = inject(ReporteService);
  private readonly notificacion = inject(NotificacionService);

  readonly columnasLote = ['nombre', 'lotCode', 'qty', 'expiryDate', 'diasRestantes', 'valor'];

  readonly cargando = signal(true);
  readonly reporte = signal<ReporteStock | null>(null);
  readonly diasParaVencer = signal(30);

  /** Urgencia: por debajo de 7 días el lote deja de ser recuperable con margen. */
  readonly lotesUrgentes = computed(
    () => this.reporte()?.porVencer.filter((l) => l.diasRestantes <= 7) ?? [],
  );

  readonly valorUrgente = computed(() =>
    this.lotesUrgentes().reduce((suma, l) => suma + l.valor, 0),
  );

  readonly categoriasCriticas = computed(() => {
    const criticos = this.reporte()?.stockCritico ?? [];
    const porNombre = new Map<string, number>();
    for (const p of criticos) {
      porNombre.set(p.nombre, (porNombre.get(p.nombre) ?? 0) + p.faltante);
    }
    return [...porNombre.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nombre, faltante]) => ({ nombre, faltante }));
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.reportes.stock(this.diasParaVencer()).subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cambiarDias(valor: number): void {
    this.diasParaVencer.set(valor);
    this.cargar();
  }

  urgencia(dias: number): 'error' | 'warn' | 'ok' {
    if (dias <= 7) return 'error';
    if (dias <= 15) return 'warn';
    return 'ok';
  }
}