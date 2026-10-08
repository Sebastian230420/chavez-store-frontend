import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Encabezado de página: título, subtítulo y espacio para acciones. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <header class="encabezado">
      <div class="encabezado__texto">
        <h1>
          @if (icono()) {
            <mat-icon class="encabezado__icono">{{ icono() }}</mat-icon>
          }
          {{ titulo() }}
        </h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="encabezado__acciones">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      .encabezado {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      h1 {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .encabezado__icono {
        color: var(--cs-info);
      }
      p {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--cs-texto-suave);
        max-width: 70ch;
      }
      .encabezado__acciones {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly icono = input<string>('');
}