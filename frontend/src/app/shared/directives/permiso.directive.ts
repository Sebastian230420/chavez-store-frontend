import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Rol } from '../../core/enums';
import { AuthService } from '../../core/services/auth.service';

/**
 * Oculta un elemento si el usuario no tiene el rol indicado.
 * Uso: `<button *appPermiso="Rol.ADMIN">Anular</button>`
 *      `<button *appPermiso="[Rol.ADMIN, Rol.SUPERVISOR]">Recibir</button>`
 *
 * Solo oculta UI: la autorización real la aplica el backend (AUTH_006).
 * ADMIN implícitamente cumple cualquier requisito.
 */
@Directive({ selector: '[appPermiso]' })
export class PermisoDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  /** Rol o lista de roles que habilitan el elemento. */
  readonly appPermiso = input.required<Rol | Rol[]>();

  private visible = false;

  constructor() {
    // `auth.roles()` es un signal: leerlo dentro del effect crea la dependencia.
    effect(() => {
      this.auth.roles();
      const requerido = this.appPermiso();
      const roles = Array.isArray(requerido) ? requerido : [requerido];
      const habilitado = this.auth.tieneRol(...roles);

      if (habilitado && !this.visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.visible = true;
      } else if (!habilitado && this.visible) {
        this.viewContainer.clear();
        this.visible = false;
      }
    });
  }
}