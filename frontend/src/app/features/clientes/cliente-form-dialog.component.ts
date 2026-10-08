import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TipoCliente } from '../../core/enums';
import { Cliente, ClienteRequest } from '../../core/models/cliente.model';
import { ClienteService } from '../../core/services/cliente.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/**
 * ESQUEMA_API.md §11.1
 * R-CL-01 documento único y obligatorio · R-CL-02 nombre mínimo 3
 * R-CL-03 al menos teléfono o email · CLI_001 documento duplicado
 */
@Component({
  selector: 'app-cliente-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cs-form" novalidate>
        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Documento</mat-label>
            <input matInput formControlName="document" maxlength="20" placeholder="DNI / RUC / CE" />
            <mat-icon matSuffix>badge</mat-icon>
            @if (form.controls.document.touched && form.controls.document.invalid) {
              <mat-error>El documento es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="type">
              <mat-option value="CONSUMIDOR">Consumidor</mat-option>
              <mat-option value="MAYORISTA">Mayorista</mat-option>
            </mat-select>
            <mat-hint>Solo segmenta reportes: hay un solo precio</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Nombre o razón social</mat-label>
          <input matInput formControlName="fullName" maxlength="150" />
          <mat-icon matSuffix>person</mat-icon>
          @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
            <mat-error>Mínimo 3 caracteres</mat-error>
          }
        </mat-form-field>

        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="phone" maxlength="30" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" maxlength="100" type="email" />
            @if (form.hasError('sinContacto')) {
              <mat-error>Debes informar teléfono o email</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="address" maxlength="200" />
        </mat-form-field>

        <div class="cs-grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Límite de crédito</mat-label>
            <input
              matInput
              formControlName="creditLimit"
              type="number"
              min="0"
              step="0.01"
              [readonly]="data !== null"
            />
            <span matTextPrefix>S/&nbsp;</span>
            <mat-hint>
              {{ data ? 'Solo ADMIN puede cambiarlo' : '0 = sin cupo para ventas a crédito' }}
            </mat-hint>
          </mat-form-field>

          <div class="cs-toggle">
            <mat-slide-toggle formControlName="active">Activo</mat-slide-toggle>
          </div>
        </div>
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
      .cs-toggle {
        display: flex;
        align-items: center;
        padding-bottom: 18px;
      }
    `,
  ],
})
export class ClienteFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientes = inject(ClienteService);
  private readonly dialogRef = inject(MatDialogRef<ClienteFormDialogComponent, Cliente | null>);
  private readonly notificacion = inject(NotificacionService);

  readonly data = inject<Cliente | null>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);
  readonly tipos = Object.values(TipoCliente);

  readonly form = this.fb.nonNullable.group(
    {
      document: [this.data?.document ?? '', [Validators.required, Validators.maxLength(20)]],
      type: [this.data?.type ?? TipoCliente.CONSUMIDOR, [Validators.required]],
      fullName: [
        this.data?.fullName ?? '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(150)],
      ],
      phone: [this.data?.phone ?? ''],
      email: [this.data?.email ?? ''],
      address: [this.data?.address ?? ''],
      creditLimit: [Number(this.data?.creditLimit ?? 0), [Validators.required, Validators.min(0)]],
      active: [this.data?.active ?? true],
    },
    {
      // R-CL-03: al menos un medio de contacto.
      validators: (grupo) => {
        const telefono = String(grupo.value.phone ?? '').trim();
        const email = String(grupo.value.email ?? '').trim();
        return telefono || email ? null : { sinContacto: true };
      },
    },
  );

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const v = this.form.getRawValue();
    const request: ClienteRequest = {
      document: v.document.trim(),
      type: v.type,
      fullName: v.fullName.trim(),
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      // R-CL-04: el límite solo lo cambia ADMIN, y en la práctica vía su diálogo dedicado.
      creditLimit: this.data ? undefined : Number(v.creditLimit),
      active: v.active,
    };

    const peticion = this.data
      ? this.clientes.actualizar(this.data.id, request)
      : this.clientes.crear(request);

    peticion.subscribe({
      next: (cliente) => {
        this.cargando.set(false);
        this.notificacion.exito(this.data ? 'Cliente actualizado' : 'Cliente creado');
        this.dialogRef.close(cliente);
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