import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TipoPresentacion, UnidadBase } from '../../core/enums';
import { Categoria, Marca } from '../../core/models/catalogo.model';
import { Producto, ProductoRequest, PresentacionRequest } from '../../core/models/producto.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { MarcaService } from '../../core/services/marca.service';
import { ProductoService } from '../../core/services/producto.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { mensajeDeError } from '../../core/interceptors/error.interceptor';

/** Controles de una línea de presentación dentro del FormArray. */
export interface PresentacionFormControls {
  name: FormControl<string>;
  unitsBase: FormControl<number>;
  type: FormControl<TipoPresentacion>;
  price: FormControl<number | null>;
  stockMin: FormControl<number | null>;
  active: FormControl<boolean>;
}

/**
 * ESQUEMA_API.md §5.2 / §5.3
 * Reglas que la UI hace visibles:
 *  - R-C-01 SKU autogenerado si va vacío
 *  - R-C-04 al menos una presentación VENTA
 *  - R-C-05 unitsBase > 0
 *  - R-C-06 precio obligatorio en presentaciones VENTA
 *  - R-C-08 la categoría no se edita en un producto ya creado
 *  - R-C-09 costAvg no es editable: solo lo recalcula el sistema
 */
@Component({
  selector: 'app-producto-form-dialog',
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
  templateUrl: './producto-form-dialog.component.html',
  styleUrl: './producto-form-dialog.component.scss',
})
export class ProductoFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productos = inject(ProductoService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly marcasService = inject(MarcaService);
  private readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent, boolean>);
  private readonly notificacion = inject(NotificacionService);

  readonly data = inject<Producto | null>(MAT_DIALOG_DATA);

  readonly cargando = signal(false);
  readonly categorias = signal<Categoria[]>([]);
  readonly marcas = signal<Marca[]>([]);

  readonly editando = computed(() => !!this.data);
  readonly tiposPresentacion = Object.values(TipoPresentacion);
  readonly unidades = Object.values(UnidadBase);

  readonly form = this.fb.nonNullable.group({
    sku: [this.data?.sku ?? ''],
    barcode: [this.data?.barcode ?? ''],
    name: [
      this.data?.name ?? '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(150)],
    ],
    description: [this.data?.description ?? ''],
    categoriaId: [this.data?.categoria?.id ?? null, [Validators.required]],
    marcaId: [this.data?.marca?.id ?? null],
    baseUnit: [this.data?.baseUnit ?? UnidadBase.UNIDAD, [Validators.required]],
    contentMl: [this.data?.contentMl ?? null],
    minStock: [this.data?.minStock ?? 0, [Validators.required, Validators.min(0)]],
    maxStock: [this.data?.maxStock ?? null, [Validators.min(0)]],
    active: [this.data?.active ?? true],
    presentaciones: this.fb.array<FormGroup<PresentacionFormControls>>([]),
  });

  get presentaciones(): FormArray<FormGroup<PresentacionFormControls>> {
    return this.form.controls.presentaciones;
  }

  /** R-C-04: debe existir al menos una presentación de tipo VENTA. */
  readonly sinPresentacionVenta = computed(
    () =>
      this.presentaciones.length === 0 ||
      this.presentaciones.controls.every((g) => g.controls.type.value !== TipoPresentacion.VENTA),
  );

  constructor() {
    this.categoriasService.listar().subscribe((lista) => this.categorias.set(lista));
    this.marcasService.listar().subscribe((lista) => this.marcas.set(lista));

    if (this.data?.presentaciones?.length) {
      for (const p of this.data.presentaciones) this.agregarPresentacion(p);
    } else {
      this.agregarPresentacion();
    }
  }

  agregarPresentacion(inicial?: Partial<PresentacionRequest>): void {
    const grupo = this.fb.nonNullable.group(
      {
        name: this.fb.nonNullable.control<string>(inicial?.name ?? '', [
          Validators.required,
          Validators.maxLength(60),
        ]),
        unitsBase: this.fb.nonNullable.control<number>(inicial?.unitsBase ?? 1, [
          Validators.required,
          Validators.min(1),
        ]),
        type: this.fb.nonNullable.control<TipoPresentacion>(
          inicial?.type ?? TipoPresentacion.VENTA,
          [Validators.required],
        ),
        price: this.fb.nonNullable.control<number | null>(inicial?.price ?? null),
        stockMin: this.fb.nonNullable.control<number | null>(inicial?.stockMin ?? null),
        active: this.fb.nonNullable.control<boolean>(true),
      },
      { validators: (g) => this.validarPresentacion(g) },
    );
    this.presentaciones.push(grupo);
  }

  /** R-C-06: una presentación VENTA sin precio no puede usarse en venta. */
  private validarPresentacion(grupo: AbstractControl): Record<string, boolean> | null {
    const errores: Record<string, boolean> = {};
    const tipo = grupo.get('type')?.value as TipoPresentacion;
    const precio = grupo.get('price')?.value;
    const unidades = Number(grupo.get('unitsBase')?.value ?? 0);

    if (tipo === TipoPresentacion.VENTA && (precio === null || Number(precio) <= 0)) {
      errores['precioRequerido'] = true;
    }
    if (unidades <= 0) {
      errores['unidadesInvalidas'] = true;
    }
    return Object.keys(errores).length ? errores : null;
  }

  esVenta(grupo: FormGroup<PresentacionFormControls>): boolean {
    return grupo.controls.type.value === TipoPresentacion.VENTA;
  }

  quitarPresentacion(indice: number): void {
    this.presentaciones.removeAt(indice);
  }

  hayPresentacionesInvalidas(): boolean {
    return this.presentaciones.controls.some((g) => g.invalid);
  }

  guardar(): void {
    if (this.form.invalid || this.sinPresentacionVenta() || this.hayPresentacionesInvalidas()) {
      this.form.markAllAsTouched();
      this.presentaciones.controls.forEach((g) => g.markAllAsTouched());
      return;
    }

    this.cargando.set(true);
    const valor = this.form.getRawValue();

    const presentaciones: PresentacionRequest[] = valor.presentaciones.map((p, i) => ({
      name: p.name,
      unitsBase: Number(p.unitsBase),
      type: p.type,
      price: p.type === TipoPresentacion.VENTA ? Number(p.price ?? 0) : 0,
      stockMin: p.stockMin === null ? null : Number(p.stockMin),
      sortOrder: i,
      active: p.active,
    }));

    if (this.data) {
      // R-C-08: la categoría no se envía en la actualización.
      this.productos
        .actualizar(this.data.id, {
          name: valor.name,
          barcode: valor.barcode || null,
          description: valor.description || null,
          marcaId: valor.marcaId,
          minStock: Number(valor.minStock),
          maxStock: valor.maxStock === null ? null : Number(valor.maxStock),
          active: valor.active,
          presentaciones,
        })
        .subscribe({
          next: () => this.finalizar('Producto actualizado'),
          error: (err: unknown) => this.fallar(err),
        });
      return;
    }

    const request: ProductoRequest = {
      sku: valor.sku || null,
      barcode: valor.barcode || null,
      name: valor.name,
      description: valor.description || null,
      categoriaId: Number(valor.categoriaId),
      marcaId: valor.marcaId,
      baseUnit: valor.baseUnit,
      contentMl: valor.contentMl === null ? null : Number(valor.contentMl),
      minStock: Number(valor.minStock),
      maxStock: valor.maxStock === null ? null : Number(valor.maxStock),
      presentaciones,
      active: valor.active,
    };

    this.productos.crear(request).subscribe({
      next: () => this.finalizar('Producto creado'),
      error: (err: unknown) => this.fallar(err),
    });
  }

  private finalizar(mensaje: string): void {
    this.cargando.set(false);
    this.notificacion.exito(mensaje);
    this.dialogRef.close(true);
  }

  private fallar(err: unknown): void {
    this.cargando.set(false);
    this.notificacion.error(mensajeDeError(err));
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}