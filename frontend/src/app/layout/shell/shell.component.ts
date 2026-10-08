import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CambiarPasswordDialogComponent } from '../../features/auth/cambiar-password-dialog.component';
import { MENU, MenuGrupo } from './menu.config';

const ANCHO_COMPACTO = 960;

/**
 * Contenedor de la aplicación: toolbar con identidad y menú lateral
 * filtrado por rol (ESQUEMA_API.md §13).
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly compacto = signal(window.innerWidth < ANCHO_COMPACTO);
  readonly menuAbierto = signal(window.innerWidth >= ANCHO_COMPACTO);

  readonly usuario = this.auth.usuario;
  readonly nombreCompleto = this.auth.nombreCompleto;
  readonly roles = this.auth.roles;

  readonly modo = computed<'over' | 'side'>(() => (this.compacto() ? 'over' : 'side'));
  readonly verTextoMenu = computed(() => !this.compacto() && this.menuAbierto());

  /** Grupos del menú con al menos un ítem visible para el usuario actual. */
  readonly grupos = computed<MenuGrupo[]>(() =>
    MENU.map((grupo) => ({
      titulo: grupo.titulo,
      items: grupo.items.filter((item) => item.roles.length === 0 || this.auth.tieneRol(...item.roles)),
    })).filter((grupo) => grupo.items.length > 0),
  );

  @HostListener('window:resize')
  onResize(): void {
    const compacto = window.innerWidth < ANCHO_COMPACTO;
    this.compacto.set(compacto);
    if (!compacto) this.menuAbierto.set(true);
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  navegar(): void {
    if (this.compacto()) this.menuAbierto.set(false);
  }

  abrirCambiarPassword(): void {
    this.dialog.open(CambiarPasswordDialogComponent, {
      width: '460px',
      maxWidth: '94vw',
      data: { username: this.usuario() },
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}