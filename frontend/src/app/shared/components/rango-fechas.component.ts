import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Selector de período con atajos, compartido por todos los reportes (§12).
 * Emite siempre fechas `YYYY-MM-DD`, el formato que espera el backend.
 * Usa `<input type="date">` nativo para no depender del locale del DateAdapter.
 */
@Component({
  selector: 'app-rango-fechas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="rango cs-toolbar-filtros">
      <mat-form-field appearance="outline" class="rango__campo" subscriptSizing="dynamic">
        <mat-label>Desde</mat-label>
        <input
          matInput
          type="date"
          [ngModel]="desdeLocal()"
          (ngModelChange)="onDesde($event)"
          [max]="hastaLocal()"
        />
      </mat-form-field>

      <mat-form-field appearance="outline" class="rango__campo" subscriptSizing="dynamic">
        <mat-label>Hasta</mat-label>
        <input
          matInput
          type="date"
          [ngModel]="hastaLocal()"
          (ngModelChange)="onHasta($event)"
          [min]="desdeLocal()"
        />
      </mat-form-field>

      <div class="rango__atajos">
        @for (atajo of atajos; track atajo.etiqueta) {
          <button mat-stroked-button type="button" (click)="aplicar(atajo.clave)">
            {{ atajo.etiqueta }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .rango__campo {
        width: 170px;
      }
      .rango__atajos {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class RangoFechasComponent {
  /** Fechas en `YYYY-MM-DD`. */
  readonly desde = input.required<string>();
  readonly hasta = input.required<string>();

  readonly cambio = output<{ desde: string; hasta: string }>();

  readonly atajos = [
    { etiqueta: 'Hoy', clave: 'hoy' as const },
    { etiqueta: '7 días', clave: 'siete' as const },
    { etiqueta: '30 días', clave: 'treinta' as const },
    { etiqueta: 'Mes actual', clave: 'mesActual' as const },
    { etiqueta: 'Mes anterior', clave: 'mesAnterior' as const },
  ];

  readonly desdeLocal = computed(() => this.desde());
  readonly hastaLocal = computed(() => this.hasta());

  onDesde(valor: string): void {
    if (valor) this.cambio.emit({ desde: valor, hasta: this.hasta() });
  }

  onHasta(valor: string): void {
    if (valor) this.cambio.emit({ desde: this.desde(), hasta: valor });
  }

  aplicar(clave: (typeof this.atajos)[number]['clave']): void {
    const hoy = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let desde = iso(hoy);
    let hasta = iso(hoy);

    switch (clave) {
      case 'hoy':
        break;
      case 'siete':
        desde = iso(menosDias(hoy, 6));
        break;
      case 'treinta':
        desde = iso(menosDias(hoy, 29));
        break;
      case 'mesActual':
        desde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        hasta = iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
        break;
      case 'mesAnterior':
        desde = iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
        hasta = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
        break;
    }

    this.cambio.emit({ desde, hasta });
  }
}

function menosDias(desde: Date, dias: number): Date {
  const copia = new Date(desde);
  copia.setDate(copia.getDate() - dias);
  return copia;
}

/** Rango por defecto: mes en curso. */
export function rangoMesActual(): { desde: string; hasta: string } {
  const hoy = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: iso(hoy),
  };
}

/** Fecha de hoy en `YYYY-MM-DD` (para §12.8 ventas-del-dia). */
export function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}