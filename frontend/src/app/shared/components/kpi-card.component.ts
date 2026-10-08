import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Tarjeta de indicador: etiqueta, valor y variación opcional. */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="kpi">
      <div class="kpi__cuerpo">
        <span class="kpi__etiqueta">{{ etiqueta() }}</span>
        <strong class="kpi__valor">{{ valor() }}</strong>
        @if (detalle()) {
          <span class="kpi__detalle">{{ detalle() }}</span>
        }
      </div>
      @if (icono()) {
        <mat-icon class="kpi__icono" [class]="'kpi__icono kpi__icono--' + tono()">{{ icono() }}</mat-icon>
      }
    </div>
  `,
  styles: [
    `
      .kpi {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        background: #fff;
        border: 1px solid var(--cs-borde);
        border-radius: 12px;
        padding: 16px 18px;
        height: 100%;
        box-sizing: border-box;
      }
      .kpi__cuerpo {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .kpi__etiqueta {
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--cs-texto-suave);
      }
      .kpi__valor {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.15;
        font-variant-numeric: tabular-nums;
      }
      .kpi__detalle {
        font-size: 12px;
        color: var(--cs-texto-suave);
      }
      .kpi__icono {
        width: 42px;
        height: 42px;
        font-size: 42px;
        display: grid;
        place-items: center;
        border-radius: 12px;
      }
      .kpi__icono--neutro {
        color: #5b6472;
        background: #eef0f3;
      }
      .kpi__icono--ok {
        color: var(--cs-ok);
        background: var(--cs-ok-bg);
      }
      .kpi__icono--warn {
        color: var(--cs-warn);
        background: var(--cs-warn-bg);
      }
      .kpi__icono--error {
        color: var(--cs-error);
        background: var(--cs-error-bg);
      }
      .kpi__icono--info {
        color: var(--cs-info);
        background: var(--cs-info-bg);
      }
    `,
  ],
})
export class KpiCardComponent {
  readonly etiqueta = input.required<string>();
  /** Texto ya formateado (usa los pipes `moneda`, `entero`, `porcentaje`). */
  readonly valor = input.required<string>();
  readonly detalle = input<string>('');
  readonly icono = input<string>('');
  readonly tono = input<'neutro' | 'ok' | 'warn' | 'error' | 'info'>('neutro');
}