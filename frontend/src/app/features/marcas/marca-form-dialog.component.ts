import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Marca, MarcaRequest } from '../../core/models/catalogo.model';
import { MarcaService } from '../../core/services/marca.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** ESQUEMA_API.md §4 — alta/edición de marca. */
@Component({
  selector: 'app-marca-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar marca' : 'Nueva marca' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cs-form" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" maxlength="80" />
          <mat-icon matSuffix>sell</mat-icon>
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
        </mat-form-field>

        <mat-slide-toggle formControlName="active">Activa</mat-slide-toggle>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="cargando()" (click)="guardar()">
        {{ data ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cs-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 8px;
      }
    `,
  ],
})
export class MarcaFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MarcaFormDialogComponent, boolean>);
  private readonly marcas = inject(MarcaService);
  private readonly notificacion = inject(NotificacionService);

  readonly data = inject<Marca | null>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(80)]],
    active: [this.data?.active ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const request: MarcaRequest = this.form.getRawValue();

    const peticion = this.data
      ? this.marcas.actualizar(this.data.id, request)
      : this.marcas.crear(request);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacion.exito(this.data ? 'Marca actualizada' : 'Marca creada');
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