import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Chip de estado reutilizable. La variante la decide el componente según el
 * catálogo: venta PAGADA/ANULADA, compra REGISTRADA/RECEBIDA/ANULADA,
 * stock NORMAL/CRÍTICO/AGOTADO.
 */
@Component({
  selector: 'app-estado-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [class]="'chip--' + variante()">
      <span class="chip__punto"></span>{{ etiqueta() }}
    </span>
  `,
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid transparent;
      }
      .chip__punto {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .chip--ok {
        color: #1f8a4c;
        background: #e6f4ec;
        border-color: #bfe3cf;
      }
      .chip--error {
        color: #c0392b;
        background: #fbeae8;
        border-color: #f2c7c1;
      }
      .chip--warn {
        color: #b26a00;
        background: #fdf3e0;
        border-color: #f4ddb4;
      }
      .chip--info {
        color: #1c6fb5;
        background: #e7f1fb;
        border-color: #c3dcf5;
      }
      .chip--neutro {
        color: #5b6472;
        background: #eef0f3;
        border-color: #dde1e6;
      }
    `,
  ],
})
export class EstadoChipComponent {
  /** Valor crudo del enum (`PAGADA`, `RECEBIDA`, `NORMAL`…). */
  readonly valor = input.required<string | null | undefined>();
  /** Etiqueta a mostrar; por defecto el propio valor. */
  readonly texto = input<string | null | undefined>(undefined);
  /** Paleta explícita; si no se indica se deriva del valor. */
  readonly tipo = input<'ok' | 'error' | 'warn' | 'info' | 'neutro' | undefined>(undefined);

  readonly etiqueta = computed(() => this.texto() ?? this.valor() ?? '—');

  readonly variante = computed(() => {
    const explicito = this.tipo();
    if (explicito) return explicito;
    const valor = this.valor();
    if (!valor) return 'neutro';
    switch (valor) {
      case 'PAGADA':
      case 'RECIBIDA':
      case 'NORMAL':
      case 'ACTIVA':
        return 'ok';
      case 'ANULADA':
      case 'AGOTADO':
      case 'INACTIVA':
        return 'error';
      case 'CRITICO':
      case 'REGISTRADA':
        return 'warn';
      case 'CREDITO':
      case 'MAYORISTA':
        return 'info';
      default:
        return 'neutro';
    }
  });
}