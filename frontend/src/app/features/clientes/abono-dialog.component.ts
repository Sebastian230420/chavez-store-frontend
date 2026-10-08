import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MetodoPago } from '../../core/enums';
import { Abono, AbonoRequest, Cliente } from '../../core/models/cliente.model';
import { Venta } from '../../core/models/venta.model';
import { ClienteService } from '../../core/services/cliente.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { MonedaPipe } from '../../shared/pipes/formato.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';

/**
 * `POST /api/clientes/{id}/abonos` — ESQUEMA_API.md §11.3
 * R-CL-07 el abono es el único registro de dinero recibido.
 * R-CL-10 no puede superar el saldo pendiente (SAL_005).
 * R-CL-11 `appliedSaleId` es opcional: abono a cuenta general o a una venta concreta.
 */
@Component({
  selector: 'app-abono-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MonedaPipe,
    FechaPipe,
  ],
  templateUrl: './abono-dialog.component.html',
  styleUrl: './abono-dialog.component.scss',
})
export class AbonoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientes = inject(ClienteService);
  private readonly dialogRef = inject(MatDialogRef<AbonoDialogComponent, Abono | null>);
  private readonly notificacion = inject(NotificacionService);

  readonly cliente = inject<Cliente>(MAT_DIALOG_DATA);
  readonly metodos = Object.values(MetodoPago);
  readonly cargando = signal(false);
  readonly ventas = signal<Venta[]>([]);

  readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: [MetodoPago.EFECTIVO, [Validators.required]],
    appliedSaleId: [null as number | null],
    notes: [''],
  });

  readonly saldo = computed(() => Number(this.cliente.saldoActual ?? 0));
  readonly monto = computed(() => Number(this.form.controls.amount.value || 0));
  readonly ventaSeleccionada = computed(
    () => this.ventas().find((v) => v.id === this.form.controls.appliedSaleId.value) ?? null,
  );

  /**
   * Tope del abono: el saldo del cliente si va a cuenta general,
   * o el total de la venta elegida (R-CL-11). El backend valida el
   * saldo exacto de esa venta y devuelve SAL_005 si se excede.
   */
  readonly saldoVentaSeleccionada = computed(() => {
    const venta = this.ventaSeleccionada();
    return venta ? venta.total : this.saldo();
  });

  readonly excedeSaldo = computed(() => this.monto() > this.saldoVentaSeleccionada());

  constructor() {
    this.clientes.listarVentasCredito(this.cliente.id).subscribe({
      next: (lista) => this.ventas.set(lista.filter((v) => v.status === 'PAGADA')),
      error: () => this.ventas.set([]),
    });
  }

  guardar(): void {
    if (this.form.invalid || this.excedeSaldo()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const request: AbonoRequest = {
      amount: Number(valor.amount),
      method: valor.method,
      appliedSaleId: valor.appliedSaleId,
      notes: valor.notes || null,
    };

    this.cargando.set(true);
    this.clientes.registrarAbono(this.cliente.id, request).subscribe({
      next: (abono) => {
        this.cargando.set(false);
        this.notificacion.exito(`Abono de ${request.amount.toFixed(2)} registrado`);
        this.dialogRef.close(abono);
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