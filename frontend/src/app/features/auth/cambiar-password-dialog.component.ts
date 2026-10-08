import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** R-A-03 — 8 caracteres, 1 mayúscula, 1 minúscula, 1 dígito. */
const PATRON_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]{8,}$/;

/** `PUT /api/auth/password` — ESQUEMA_API.md §2.3 */
@Component({
  selector: 'app-cambiar-password-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <mat-dialog-content>
      <p class="cs-suave cs-ayuda">
        Mínimo 8 caracteres, con 1 mayúscula, 1 minúscula y 1 dígito.
      </p>

      <form [formGroup]="form" (ngSubmit)="guardar()" id="form-password" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Contraseña actual</mat-label>
          <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
          <mat-icon matSuffix>lock</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nueva contraseña</mat-label>
          <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
          <mat-icon matSuffix>lock_reset</mat-icon>
          @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) {
            <mat-error>
              @if (form.controls.newPassword.hasError('patron')) {
                Debe tener 8+ caracteres, 1 mayúscula, 1 minúscula y 1 dígito
              }
            </mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Repetir nueva contraseña</mat-label>
          <input matInput type="password" formControlName="repeticion" autocomplete="new-password" />
          @if (form.hasError('noCoincide') && form.controls.repeticion.touched) {
            <mat-error>Las contraseñas no coinciden</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="cargando()" (click)="guardar()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      form {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 8px;
      }
      .cs-ayuda {
        font-size: 12.5px;
        margin: 0 0 6px;
      }
    `,
  ],
})
export class CambiarPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<CambiarPasswordDialogComponent>);
  private readonly notificacion = inject(NotificacionService);
  readonly data = inject<{ username: string | null }>(MAT_DIALOG_DATA);

  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.pattern(PATRON_PASSWORD)]],
      repeticion: ['', [Validators.required]],
    },
    { validators: (grupo) => (grupo.value.newPassword === grupo.value.repeticion ? null : { noCoincide: true }) },
  );

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.auth.cambiarPassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacion.exito('Contraseña actualizada');
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}