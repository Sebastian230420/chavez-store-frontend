import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Estado vacío de tablas y listados. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="vacio">
      <mat-icon>{{ icono() }}</mat-icon>
      <strong>{{ titulo() }}</strong>
      @if (detalle()) {
        <span>{{ detalle() }}</span>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .vacio {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 44px 16px;
        color: var(--cs-texto-suave);
        text-align: center;
      }
      .vacio mat-icon {
        width: 40px;
        height: 40px;
        font-size: 40px;
        opacity: 0.45;
      }
      .vacio strong {
        color: #3d4553;
        font-size: 15px;
      }
      .vacio span {
        font-size: 13px;
        max-width: 52ch;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly titulo = input.required<string>();
  readonly detalle = input<string>('');
  readonly icono = input<string>('inbox');
}