import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Proveedor, ProveedorRequest } from '../../core/models/proveedor.model';
import { ProveedorService } from '../../core/services/proveedor.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** ESQUEMA_API.md §8 — R-CO-06: el documento es único y se autogenera si no se envía. */
@Component({
  selector: 'app-proveedor-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cs-form" novalidate>
        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Nombre o razón social</mat-label>
            <input matInput formControlName="name" maxlength="150" />
            <mat-icon matSuffix>store</mat-icon>
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Documento</mat-label>
            <input matInput formControlName="document" maxlength="20" />
            <mat-hint>Se autogenera si lo dejas vacío</mat-hint>
          </mat-form-field>
        </div>

        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="phone" maxlength="30" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" maxlength="100" type="email" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="address" maxlength="200" />
        </mat-form-field>

        <mat-slide-toggle formControlName="active">
          Activo <span class="cs-suave cs-hint">(R-CO-09: inactivo no recibe compras)</span>
        </mat-slide-toggle>
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
        padding-top: 4px;
      }
      .cs-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 12px;
      }
      .cs-hint {
        font-size: 12px;
        margin-left: 4px;
      }
    `,
  ],
})
export class ProveedorFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proveedores = inject(ProveedorService);
  private readonly dialogRef = inject(MatDialogRef<ProveedorFormDialogComponent, Proveedor | null>);
  private readonly notificacion = inject(NotificacionService);

  readonly data = inject<Proveedor | null>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    document: [this.data?.document ?? '', [Validators.maxLength(20)]],
    phone: [this.data?.phone ?? ''],
    email: [this.data?.email ?? ''],
    address: [this.data?.address ?? ''],
    active: [this.data?.active ?? true],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const v = this.form.getRawValue();
    const request: ProveedorRequest = {
      name: v.name.trim(),
      document: v.document?.trim() || null,
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      active: v.active,
    };

    const peticion = this.data
      ? this.proveedores.actualizar(this.data.id, request)
      : this.proveedores.crear(request);

    peticion.subscribe({
      next: (proveedor) => {
        this.cargando.set(false);
        this.notificacion.exito(this.data ? 'Proveedor actualizado' : 'Proveedor creado');
        this.dialogRef.close(proveedor);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}