import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Rol } from '../../core/enums';
import {
  ReporteCuentasPorCobrar,
  ReporteStock,
  ReporteVentasDelDia,
} from '../../core/models/reporte.model';
import { AuthService } from '../../core/services/auth.service';
import { ReporteService } from '../../core/services/reporte.service';
import { KpiCardComponent } from '../../shared/components/kpi-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { hoy } from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe, PorcentajePipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';

/**
 * Resumen operativo del día, armado con los endpoints de ESQUEMA_API.md §12.8,
 * §12.5 y §12.7. Cada bloque se carga solo si el rol tiene acceso (§13),
 * para que un CAJERO no reciba 403.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    KpiCardComponent,
    PageHeaderComponent,
    MonedaPipe,
    EnteroPipe,
    PorcentajePipe,
    FechaPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly reportes = inject(ReporteService);

  readonly esAdmin = this.auth.esAdmin;
  readonly cargando = signal(true);
  readonly fecha = signal(hoy());

  readonly ventas = signal<ReporteVentasDelDia | null>(null);
  readonly stock = signal<ReporteStock | null>(null);
  readonly cartera = signal<ReporteCuentasPorCobrar | null>(null);

  readonly puedeVerVentasDelDia = computed(() => this.auth.tieneRol(Rol.ADMIN, Rol.SUPERVISOR));
  readonly puedeVerStock = computed(() => this.auth.tieneRol(Rol.ADMIN, Rol.SUPERVISOR, Rol.ALMACENERO));
  readonly puedeVerCartera = computed(() => this.auth.tieneRol(Rol.ADMIN));

  readonly margenHoy = computed(() => {
    const resumen = this.ventas()?.resumen;
    if (!resumen || !resumen.ingresosTotal) return null;
    return (resumen.utilidad / resumen.ingresosTotal) * 100;
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);

    forkJoin({
      ventas: this.puedeVerVentasDelDia()
        ? this.reportes.ventasDelDia(this.fecha()).pipe(catchError(() => of(null)))
        : of(null),
      stock: this.puedeVerStock()
        ? this.reportes.stock(30).pipe(catchError(() => of(null)))
        : of(null),
      cartera: this.puedeVerCartera()
        ? this.reportes.cuentasPorCobrar().pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe(({ ventas, stock, cartera }) => {
      this.ventas.set(ventas);
      this.stock.set(stock);
      this.cartera.set(cartera);
      this.cargando.set(false);
    });
  }
}