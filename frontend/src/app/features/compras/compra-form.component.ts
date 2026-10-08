import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TipoPresentacion } from '../../core/enums';
import {
  CompraRequest,
  DetalleCompraRequest,
} from '../../core/models/compra.model';
import { Producto, Presentacion } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { CompraService } from '../../core/services/compra.service';
import { ProductoService } from '../../core/services/producto.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';
import { hoy } from '../../shared/components/rango-fechas.component';
import { MonedaPipe } from '../../shared/pipes/formato.pipe';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

/** Controles de una línea de compra. */
interface DetalleCompraControls {
  productoId: FormControl<number | null>;
  presentacionId: FormControl<number | null>;
  qty: FormControl<number>;
  unitCost: FormControl<number>;
  expiryDate: FormControl<string | null>;
}

/**
 * `POST /api/compras` — ESQUEMA_API.md §9.2
 * R-CO-01 al menos un ítem · R-CO-02 ADMIN | ALMACENERO
 * R-CO-07 el total lo calcula el servidor a partir de los ítems.
 *
 * Registrar una compra NO suma stock: eso pasa al "recibir", que además crea
 * los lotes y recalcula el costo promedio ponderado (R-CO-03).
 */
@Component({
  selector: 'app-compra-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    PageHeaderComponent,
    MonedaPipe,
  ],
  templateUrl: './compra-form.component.html',
  styleUrl: './compra-form.component.scss',
})
export class CompraFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly compras = inject(CompraService);
  private readonly productosService = inject(ProductoService);
  private readonly proveedoresService = inject(ProveedorService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly productos = signal<Producto[]>([]);

  readonly form = this.fb.nonNullable.group({
    proveedorId: [null as number | null, [Validators.required]],
    document: [''],
    issueDate: [hoy(), [Validators.required]],
    notes: [''],
    detalles: this.fb.array<FormGroup<DetalleCompraControls>>([]),
  });

  get detalles(): FormArray<FormGroup<DetalleCompraControls>> {
    return this.form.controls.detalles;
  }

  /** R-CO-02: el proveedor debe estar activo (R-CO-09). */
  readonly proveedoresActivos = computed(() => this.proveedores().filter((p) => p.active));

  /** Presentaciones de COMPRA del producto elegido. */
  readonly presentacionesCompra = (productoId: number | null): Presentacion[] => {
    const producto = this.productos().find((p) => p.id === productoId);
    if (!producto) return [];
    return producto.presentaciones.filter((p) => p.type === TipoPresentacion.COMPRA && p.active !== false);
  };

  /** Total informativo: el definitivo lo calcula el servidor (R-CO-07). */
  readonly totalInformativo = computed(() => {
    let total = 0;
    for (const grupo of this.detalles.controls) {
      const p = grupo.controls.productoId.value;
      const presentacion = this.presentacionesCompra(p).find(
        (x) => x.id === grupo.controls.presentacionId.value,
      );
      const unidades = presentacion ? presentacion.unitsBase * Number(grupo.controls.qty.value || 0) : 0;
      total += unidades * Number(grupo.controls.unitCost.value || 0);
    }
    return total;
  });

  readonly lineasInvalidas = computed(() =>
    this.detalles.controls.some((g) => !this.lineaValida(g)),
  );

  constructor() {
    this.cargar();
    this.agregarLinea();
  }

  private cargar(): void {
    this.cargando.set(true);
    let pendientes = 2;

    this.proveedoresService.listar().subscribe({
      next: (lista) => {
        this.proveedores.set(lista);
        if (--pendientes === 0) this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });

    this.productosService.listarTodos().subscribe({
      next: (lista) => {
        this.productos.set(lista.filter((p) => p.active));
        if (--pendientes === 0) this.cargando.set(false);
      },
      error: () => {
        if (--pendientes === 0) this.cargando.set(false);
      },
    });
  }

  agregarLinea(): void {
    this.detalles.push(
      this.fb.nonNullable.group({
        productoId: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        presentacionId: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        qty: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(1)]),
        unitCost: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0.0001)]),
        expiryDate: this.fb.nonNullable.control<string | null>(null),
      }),
    );
  }

  quitarLinea(indice: number): void {
    this.detalles.removeAt(indice);
  }

  /** Al cambiar de producto se reinicia la presentación y se sugiere el costo actual. */
  productoCambiado(grupo: FormGroup<DetalleCompraControls>): void {
    grupo.controls.presentacionId.setValue(null);
    const producto = this.productos().find((p) => p.id === grupo.controls.productoId.value);
    if (producto && producto.costAvg > 0) {
      grupo.controls.unitCost.setValue(Number(producto.costAvg.toFixed(4)));
    }
  }

  presentacionCambiada(grupo: FormGroup<DetalleCompraControls>): void {
    const presentacion = this.presentacionesCompra(grupo.controls.productoId.value).find(
      (p) => p.id === grupo.controls.presentacionId.value,
    );
    if (presentacion && presentacion.price > 0) {
      grupo.controls.unitCost.setValue(Number(presentacion.price.toFixed(4)));
    }
  }

  private lineaValida(grupo: AbstractControl): boolean {
    const g = grupo as FormGroup<DetalleCompraControls>;
    return (
      !!g.controls.productoId.value &&
      !!g.controls.presentacionId.value &&
      Number(g.controls.qty.value) > 0 &&
      Number(g.controls.unitCost.value) > 0
    );
  }

  unidadesDe(grupo: FormGroup<DetalleCompraControls>): number {
    const presentacion = this.presentacionesCompra(grupo.controls.productoId.value).find(
      (p) => p.id === grupo.controls.presentacionId.value,
    );
    return presentacion ? presentacion.unitsBase * Number(grupo.controls.qty.value || 0) : 0;
  }

  subtotalDe(grupo: FormGroup<DetalleCompraControls>): number {
    return this.unidadesDe(grupo) * Number(grupo.controls.unitCost.value || 0);
  }

  puedeGuardar(): boolean {
    return (
      !this.guardando() &&
      this.form.controls.proveedorId.value !== null &&
      this.detalles.length > 0 &&
      !this.lineasInvalidas()
    );
  }

  guardar(): void {
    if (!this.puedeGuardar()) {
      this.form.markAllAsTouched();
      this.detalles.controls.forEach((g) => g.markAllAsTouched());
      return;
    }

    const valor = this.form.getRawValue();
    const request: CompraRequest = {
      proveedorId: Number(valor.proveedorId),
      document: valor.document?.trim() || null,
      issueDate: valor.issueDate,
      notes: valor.notes || null,
      detalles: valor.detalles.map<DetalleCompraRequest>((d) => ({
        productoId: Number(d.productoId),
        presentacionId: Number(d.presentacionId),
        qty: Number(d.qty),
        unitCost: Number(d.unitCost),
        expiryDate: d.expiryDate || null,
      })),
    };

    this.guardando.set(true);
    this.compras.registrar(request).subscribe({
      next: (compra) => {
        this.guardando.set(false);
        this.notificacion.exito(`Compra ${compra.document} registrada`);
        void this.router.navigate(['/compras', compra.id]);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });
  }

  volver(): void {
    void this.router.navigate(['/compras']);
  }
}