import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Rol } from '../../core/enums';
import { AuthService } from '../../core/services/auth.service';

/** Item de la navegación entre reportes. */
interface ReporteLink {
  etiqueta: string;
  ruta: string;
  roles: Rol[];
}

/**
 * Contenedor de los reportes de ESQUEMA_API.md §12.
 * Solo muestra las pestañas a las que el usuario tiene acceso (§13).
 */
@Component({
  selector: 'app-reportes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <div class="cs-reportes">
      <nav class="cs-tabs" aria-label="Reportes">
        @for (link of enlaces(); track link.ruta) {
          <a
            class="cs-tab"
            [routerLink]="link.ruta"
            routerLinkActive="cs-tab--activa"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            {{ link.etiqueta }}
          </a>
        }
      </nav>

      <div class="cs-reportes__contenido">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .cs-reportes {
        padding: 18px 24px 28px;
      }
      .cs-tabs {
        display: flex;
        gap: 4px;
        overflow-x: auto;
        padding-bottom: 2px;
        border-bottom: 1px solid var(--cs-borde);
        margin-bottom: 18px;
      }
      .cs-tab {
        padding: 9px 14px;
        border-radius: 8px 8px 0 0;
        font-size: 13.5px;
        color: var(--cs-texto-suave);
        text-decoration: none;
        white-space: nowrap;
        border-bottom: 2px solid transparent;

        &:hover {
          background: #eef1f4;
          color: #3d4553;
        }
      }
      .cs-tab--activa {
        color: var(--cs-info);
        font-weight: 600;
        border-bottom-color: var(--cs-info);
        background: var(--cs-info-bg);
      }
    `,
  ],
})
export class ReportesComponent {
  private readonly auth = inject(AuthService);

  private readonly todos: ReporteLink[] = [
    { etiqueta: 'Ventas del día', ruta: '/reportes/ventas-del-dia', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    { etiqueta: 'Ganancias', ruta: '/reportes/ganancias', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    { etiqueta: 'Por categoría', ruta: '/reportes/ganancias/categoria', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    { etiqueta: 'Por producto', ruta: '/reportes/ganancias/producto', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    { etiqueta: 'Ventas por hora', ruta: '/reportes/ventas-por-hora', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    {
      etiqueta: 'Stock y vencimientos',
      ruta: '/reportes/stock',
      roles: [Rol.ADMIN, Rol.SUPERVISOR, Rol.ALMACENERO],
    },
    { etiqueta: 'Mermas', ruta: '/reportes/mermas', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
    { etiqueta: 'Cuentas por cobrar', ruta: '/reportes/cuentas-por-cobrar', roles: [Rol.ADMIN] },
  ];

  readonly enlaces = computed(() =>
    this.todos.filter((link) => this.auth.tieneRol(...link.roles)),
  );
}