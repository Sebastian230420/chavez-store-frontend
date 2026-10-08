# Lógica de Negocio — Chavez Store

> Sistema interno de control de **stock, compras, ventas, clientes y ganancias** para una botillería.
> Arquitectura técnica en `ARQUITECTURA.md` · Modelo de datos en `MODELO_DATOS.md` · Endpoints en `ESQUEMA_API.md`
> Backend: `api-rest` (Spring Boot 4.1.1, Java 21, Lombok, `spring-boot-starter-webmvc`)
> Paquete base: `com.chavez.store.api_rest`

---

## 1. Alcance acordado

| Tema | Decisión tomada |
|------|-----------------|
| Facturación electrónica | **Fuera del sistema** — no hay módulo fiscal |
| Entrega a domicilio | **No** — solo venta en mostrador |
| Precios | **Un solo precio** — no hay listas ni precio mayorista |
| Caja | **Solo total vendido por día** — sin apertura ni arqueo |
| Venta a crédito | **Sí, con límite por cliente** |
| **Ventas** | **Registro interno.** El sistema documenta lo que se vendió; no atiende al cliente final |

**Consecuencias directas:**
- Se eliminan `price_lists`, `product_price`, módulo de delivery, emisión de comprobantes.
- **No hay POS de mostrador**: no se registra el cobro, ni métodos de pago por venta, ni voucher para el consumidor.
- `cash_sessions` y `sale_payments` **no existen**. El "total vendido por día" es un `GROUP BY DATE(sale_date)`.
- El único registro de dinero recibido es `abonos`, para cobranza de crédito a clientes mayoristas.
- **No hay impuestos**: todos los precios son finales. `subtotal == total`.

---

## 2. Conceptos centrales del dominio de bebidas

### 2.1 Presentación y unidad base
Todo el stock se lleva en **unidad base** (botella, lata, vaso). Un producto tiene sus presentaciones registradas con su factor de conversión.

| Producto | Presentación | Tipo | units_base |
|----------|--------------|------|-----------|
| Cerveza Cristal 650ml | Caja x24 | COMPRA | 24 |
| Cerveza Cristal 650ml | Unidad | VENTA | 1 |
| Cerveza Cristal 650ml | Pack x6 | VENTA | 6 |
| Gaseosa 500ml | Caja x12 | COMPRA | 12 |
| Gaseosa 500ml | Unidad | VENTA | 1 |

```
COMPRA de 10 cajas x24  →  ingreso  = 10 × 24 = 240 unidades base
VENTA  de 3 packs x6   →  egreso   =  3 ×  6 =  18 unidades base
```

El campo `products.stock` SIEMPRE está en **unidad base**. Nunca en cajas ni en packs.

### 2.2 Lotes con vencimiento y salida FEFO
Toda compra genera un lote con fecha de vencimiento. Al vender se consume **primero el lote que vence antes** (First Expired First Out).

```
Producto X tiene lotes:
  LOTE-A  vence 2026-03-15   qty_remaining = 40
  LOTE-B  vence 2026-08-20   qty_remaining = 80

Venta de 50 unidades  →  consume 40 de LOTE-A + 10 de LOTE-B
                         (se guarda lot_id en cada sale_detail)
```

Cada `sale_detail` guarda el `lot_id` consumido. Eso permite saber **en qué venta se vendió un producto que después terminó en merma**.

### 2.3 Mermas como movimiento real
Tipo de movimiento `MERMA` con motivo obligatorio. Es la única forma de saber si un producto deja utilidad o quema capital.

| Motivo | Ejemplo típico |
|--------|----------------|
| `VENCIDO` | Ganso que pasó la fecha de expiración |
| `QUIEBRE` | Botella rota en bodega |
| `ERROR_TOMA` | Salió del stock sin haber pasado por caja |

### 2.4 Costo promedio ponderado móvil
El `products.cost_avg` se recalcula en cada ingreso por compra:

```
valor_actual    = stock_actual × cost_avg_actual
valor_nuevo     = qty_recibida_base × costo_unitario_compra
stock_nuevo     = stock_actual + qty_recibida_base
cost_avg_nuevo  = (valor_actual + valor_nuevo) / stock_nuevo
```

Al vender se **guarda snapshot** de `unit_cost = cost_avg` del momento en `sale_details`. Sin esto, un reporte de ganancia de marzo usaría el costo de junio.

### 2.5 Margen teórico vs. margen real
Es la distinción que hace útil el sistema:

```
margen_teorico = (precio_venta − costo_promedio) / precio_venta
margen_real    = (precio_venta − costo_promedio − merma_asignada) / precio_venta
```

Un producto con margen teórico de 25% pero 12% de merma tiene **margen real de 13%**. El reporte de ganancias por categoría debe mostrar ambos.

---

## 3. Reglas de negocio

### 3.1 Autenticación (R-A)

| ID | Regla |
|----|-------|
| R-A-01 | `username` y `email` únicos (case-insensitive). |
| R-A-02 | Password almacenado solo como hash BCrypt. |
| R-A-03 | Password: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 dígito. |
| R-A-04 | JWT expira en 24 horas. Payload: `sub`, `roles`, `iat`, `exp`. Nunca password. |
| R-A-05 | Solo usuarios con `active = true` pueden autenticarse. |
| R-A-06 | 5 intentos fallidos → cuenta bloqueada 15 minutos, se reinicia al lograr login. |
| R-A-07 | Un usuario no puede desactivarse a sí mismo (evita auto-bloqueo). |

```
Intentos fallidos >= 5  →  locked_until = now() + 15 min  →  reject (AUTH_002)
Intentos fallidos <  5  →  se incrementa el contador
Login exitoso          →  resetear contador + locked_until
```

### 3.2 Catálogo y presentaciones (R-C)

| ID | Regla |
|----|-------|
| R-C-01 | `sku` obligatorio y único. Autogenerado (`BEB-000001`) si no se envía. |
| R-C-02 | `name` obligatorio, mínimo 3 caracteres. |
| R-C-03 | `barcode` opcional, único si se envía. Permite escanear en el POS. |
| R-C-04 | Todo producto debe tener **al menos una presentación de tipo `VENTA`**. |
| R-C-05 | `units_base` debe ser > 0. Toda conversión es a **unidad base**, nunca entre packs. |
| R-C-06 | El precio vive en la **presentación de VENTA**. Una presentación sin precio no puede usarse en el POS. |
| R-C-07 | No se puede eliminar un producto con movimientos de stock o ventas: se desactiva (`active = false`). |
| R-C-08 | La categoría de un producto no se cambia si ya tiene ventas (rompe reportes históricos). |
| R-C-09 | `cost_avg` no se edita manualmente; solo lo recalcula el sistema al recibir compras. |

### 3.3 Inventario, lotes y mermas (R-I)

| ID | Regla |
|----|-------|
| R-I-01 | `stock >= 0` siempre. Nunca se permite stock negativo. |
| R-I-02 | **Todo** cambio de stock genera un `stock_movements` con tipo, cantidad, usuario y referencia. |
| R-I-03 | `stock` en `products` es **cacheado**; el kardex es la fuente de verdad. |
| R-I-04 | Invariante: `products.stock == Σ(stock_movements.qty)`. Si no cuadra → `STK_003`, alerta crítica. |
| R-I-05 | Los movimientos de stock **nunca se borran**. Una anulación de venta genera movimientos inversos. |
| R-I-06 | Un ajuste manual exige `reason` obligatorio y rol `ADMIN` o `SUPERVISOR`. |
| R-I-07 | Una merma exige `reason` obligatorio (motivo del catálogo) y descuenta del lote FEFO. |
| R-I-08 | Una merma se puede registrar solo sobre lotes que existen y tienen `qty_remaining > 0`. |
| R-I-09 | Si `stock <= min_stock` tras cualquier operación → generar alerta de stock crítico. |
| R-I-10 | Salida por venta consume lotes en orden FEFO (`expiry_date ASC`); los lotes sin vencimiento se consumen al final. |
| R-I-11 | Si un lote está vencido y el producto tiene otro lote vigente, se puede vender (FEFO lo evita). Si NO hay lote vigente, se rechaza la venta. |

```
Regla R-I-04 — verificación de invariante
──────────────────────────────────────────
stock_cacheado  =  products.stock
stock_real      =  SUM(stock_movements.qty) WHERE product_id = X
Si stock_cacheado != stock_real  →  InventoryMismatchException (STK_003)
Nunca "corregir" el caché en silencio: es una alerta de auditoría.
```

### 3.4 Compras (R-CO)

| ID | Regla |
|----|-------|
| R-CO-01 | Una compra debe tener al menos un ítem. |
| R-CO-02 | Solo rol `ADMIN` o `ALMACENERO` puede crear/recibir compras. |
| R-CO-03 | Al **recibir** una compra: crea lote por ítem, movimiento `COMPRA`, y recalcula `cost_avg`. |
| R-CO-04 | Una compra en estado `RECEBIDA` no se puede modificar ni anular sin `ADMIN`. |
| R-CO-05 | Anular una compra `RECEBIDA` genera `DEVOLUCION_PROVEEDOR` (entorno Stock) y recalcula `cost_avg`. |
| R-CO-06 | El `document` del proveedor es único. Si está vacío, se autogenera (`PROV-000001`). |
| R-CO-07 | El total de la compra se calcula en el servidor a partir de los ítems. |
| R-CO-08 | No se puede recibir una compra si el producto o la presentación están inactivos. |
| R-CO-09 | Si el proveedor está inactivo, no puede tener compras nuevas. |

### 3.5 Ventas — registro interno (R-V)

La venta es un **asiento interno** que documenta qué se vendió, cuánto costó y cuánto se ganó.
No hay cobro, no hay voucher para el consumidor, no hay punto de venta al público.

| ID | Regla |
|----|-------|
| R-V-01 | Una venta debe tener al menos un ítem. |
| R-V-02 | Todos los ítems deben ser de productos activos y presentaciones activas con precio. |
| R-V-03 | El total se calcula en el **servidor**: `Σ(qty × presentation.price)`. Nunca se acepta el total del cliente. |
| R-V-04 | No hay impuestos ni descuentos: `total == subtotal`. |
| R-V-05 | No se registra una venta si algún producto quedaría con stock negativo. |
| R-V-06 | Al registrar: descuenta stock, consume lotes FEFO, guarda snapshot de precio y costo. |
| R-V-07 | `stock == 0` está permitido (queda en crítico, no bloquea el registro). |
| R-V-08 | Estados: `PAGADA → ANULADA`. `PAGADA` es el estado inicial. |
| R-V-09 | Una venta anulada **revierte** el stock al lote original y queda registrada. No se borra. |
| R-V-10 | Solo `ADMIN` puede anular una venta. |
| R-V-11 | El `document` es correlativo y único por año (`V-2026-000001`). |
| R-V-12 | Venta `MOSTRADOR` puede no tener cliente (no se identifica al consumidor). |
| R-V-13 | Venta `CREDITO` **exige** cliente con `credit_limit > 0`. |
| R-V-14 | La venta **no registra forma de pago**. El único registro de dinero recibido es `abonos` (R-CL-07). |
| R-V-15 | La utilidad (`sale.profit`) = `subtotal − cost_total`, calculada y congelada al registrar. |
| R-V-16 | `user_id` es obligatorio: siempre queda registrada **quién** hizo el asiento. |
| R-V-17 | Se pueden registrar ventas con fecha retroactiva, pero no con fecha futura. El `sale_date` es editable solo por `ADMIN`. |
| R-V-18 | No se edita una venta `PAGADA`. Para corregir un error de registro se anula y se vuelve a registrar (queda la trazabilidad de ambos asientos). |

```
Flujo de venta — validaciones en orden
──────────────────────────────────────
1. ¿La venta tiene ítems?                               no → SAL_001
2. ¿Todos los productos/presentaciones están activos?  no → SAL_002
3. ¿sale_date ≤ hoy?                                   no → SAL_006
4. Por cada ítem:
     a. Producto existe                                no → DAT_001
     b. Presentación existe y tiene precio              no → SAL_002
     c. ¿stock ≥ cantidad solicitada?                  no → STK_001
     d. Hay lote vigente suficiente (FEFO)             no → STK_001
5. Si type = CREDITO:
     a. Cliente existe y activo                        no → DAT_001
     b. ¿credit_limit > 0?                             no → SAL_004
     c. saldo_actual + total ≤ credit_limit            no → SAL_003
6. Calcular subtotal y total en servidor
7. Calcular cost_total y profit con los valores actuales
8. Persistir venta + detalles
9. Descontar stock + consumir lotes FEFO
10. Registrar movimientos VENTA
```

### 3.6 Clientes y crédito (R-CL)

| ID | Regla |
|----|-------|
| R-CL-01 | `document` (DNI/RUC/CE) es único y obligatorio. |
| R-CL-02 | `full_name` obligatorio, mínimo 3 caracteres. |
| R-CL-03 | Un cliente debe tener al menos teléfono o email. |
| R-CL-04 | `credit_limit` solo puede ser modificado por `ADMIN`. |
| R-CL-05 | Saldo deudor = `Σ(sales CREDITO PAGADA) − Σ(abonos vigentes)`. |
| R-CL-06 | **No se registra venta a crédito** si `saldo_actual + total_nuevo > credit_limit`. |
| R-CL-07 | Solo los **abonos** registran dinero recibido. Reducen el saldo del cliente. |
| R-CL-08 | Un cliente con saldo pendiente no puede eliminarse, solo desactivarse. |
| R-CL-09 | Solo `ADMIN` puede anular un abono. Un abono anulado vuelve a aumentar el saldo. |
| R-CL-10 | El abono no puede superar el saldo pendiente del cliente. |
| R-CL-11 | Un abono puede aplicarse a una venta concreta (`applied_sale_id`) o ser a cuenta general. |

```
Saldo deudor de un cliente
─────────────────────────
saldo = Σ( sales.total   WHERE customer_id = X AND type = 'CREDITO' AND status = 'PAGADA' )
      − Σ( abonos.amount WHERE customer_id = X AND annulled_at IS NULL )
```

### 3.7 Clientes mayoristas vs. consumidor
Como hay **un solo precio**, `customers.type` NO afecta el precio. Solo sirve para:
- Segmentar reportes (qué clientes generan más volumen).
- Valores por defecto (ej: mayorista sugiere mayor `credit_limit`, no obligatorio).
- En ventas `MOSTRADOR` el cliente puede ser `NULL`: no se identifica al consumidor final.

### 3.8 Reportes (R-R)

| ID | Regla |
|----|-------|
| R-R-01 | Ganancias solo sobre ventas `PAGADA`. Las `ANULADA` se excluyen. |
| R-R-02 | Utilidad = `ingresos − costo_ventas − mermas`. El reporte muestra las 3 columnas. |
| R-R-03 | Costo de ventas = `Σ(sale_details.unit_cost × qty)`. Nunca se recalcula con el costo actual. |
| R-R-04 | Ganancia por categoría agrupa por `products.category_id`. |
| R-R-05 | Margen % = `utilidad / ingresos × 100`. Si ingresos = 0, margen = 0. |
| R-R-06 | Mermas se miden por `stock_movements.type = MERMA` en el período. |
| R-R-07 | Stock por vencer: lotes con `expiry_date` en los próximos N días (default 30). |
| R-R-08 | Cuentas por cobrar: saldo por cliente + antigüedad (0-30 / 31-60 / 61-90 / 90+). |
| R-R-09 | Ventas por hora agrupa por `HOUR(sale_date)`. |
| R-R-10 | Reporte de productos sin movimiento: ventas = 0 en los últimos N días. |

---

## 4. Máquinas de estado

### Venta
```
        ┌──────────┐   anular (solo ADMIN)   ┌──────────┐
        │  PAGADA  │────────────────────────►│ ANULADA  │
        └──────────┘                         └──────────┘
             │  ▲
  registrar  │  │ revertir stock
             ▼  │ (genera movimientos inversos)
        (asiento interno)

Simplificación: no hay estado PENDIENTE ni COMPROBADO.
La venta es un asiento interno que nace PAGADA al registrarla.
```

| Estado actual | Transición | Quién | Efecto |
|---------------|-----------|-------|--------|
| — | → PAGADA | CAJERO / ADMIN | Descuenta stock, consume lotes, congela precio y costo |
| PAGADA | ANULADA | Solo ADMIN | **Revierte** stock a los lotes originales |

### Compra
```
REGISTRADA ──► RECIBIDA ──► (terminal)
     │            │
     └────────────┴──► (anular) ──► stock revertido
```

| Estado actual | Transición | Quién | Efecto |
|---------------|-----------|-------|--------|
| REGISTRADA | RECIBIDA | ALMACENERO / ADMIN | Crea lotes, suma stock, recalcula costo |
| REGISTRADA | ANULADA | ADMIN | Sin efecto en stock |
| RECIBIDA | ANULADA | Solo ADMIN | Devuelve stock, recalcula costo |

### Usuario
```
ACTIVO ◄──────► INACTIVO
   │
   └──► BLOQUEADO (temporal) ──► se auto-desbloquea tras 15 min
```

---

## 5. Flujos principales (paso a paso)

### 5.1 Login
```
POST /api/auth/login { username, password }

1. Buscar usuario por username                    ──► no existe → AUTH_001
2. ¿locked_until > now()?                         ──► sí → AUTH_002
3. ¿active = true?                                 ──► no → AUTH_003
4. BCrypt.matches(pwd, hash)?                     ──► no → intentos++; si == 5 → bloquear; AUTH_001
5. Resetear failed_attempts y locked_until
6. Actualizar last_login_at
7. Firmar JWT { sub: username, roles: [..], exp }
8. Retornar { token, expiresIn, username, roles, permissions }
```

### 5.2 Recibir una compra (con recálculo de costo)
```
POST /api/compras/{id}/recibir

1. Compra existe y status = REGISTRADA             ──► no → DAT_001 / SAL_002
2. Rol ADMIN | ALMACENERO                          ──► no → AUTH_006
3. Por cada purchase_detail:
     a. Producto y presentación activos             ──► no → R-CO-08
     b. Crear lote:
          lot_code = LOTE-{product.sku}-{secuencia}
          qty_received = qty_bought × units_base
          cost_unit = unit_cost
     c. SUMA:  products.stock += qty_base
     d. RECÁLCULO costo promedio ponderado:
          valor_actual = stock × cost_avg           (stock ANTES del aumento)
          valor_compra = qty_base × unit_cost
          cost_avg = (valor_actual + valor_compra) / (stock + qty_base)
     e. Crear stock_movement(COMPRA, qty=+qty_base, lot_id=nuevo)
4. purchase.status = RECIBIDA
5. purchase_details.qty_received = qty_bought
```

### 5.3 Registrar una venta interna (mostrador)
```
POST /api/ventas { type: MOSTRADOR, customerId?, saleDate?, details[] }

@Transactional:
1. ¿La venta tiene ítems?                              ──► no → SAL_001
2. ¿sale_date ≤ hoy?                                   ──► no → SAL_006
3. Por cada ítem:
     a. Producto + presentación activos y con precio     ──► no → SAL_002
     b. Calcular units_base = qty × presentation.units_base
     c. ¿stock ≥ units_base?                             ──► no → STK_001
     d. Snapshot: unit_price = presentation.price, unit_cost = product.cost_avg
4. Calcular subtotal = Σ(qty × unit_price)   [total = subtotal, sin impuestos]
5. cost_total = Σ(units_base × unit_cost)
6. profit = subtotal − cost_total
7. Generar document correlativo  V-{año}-{secuencia}
8. Persistir sale (status=PAGADA, user_id = quién registró)
9. Por cada ítem:
     a. Consumir lotes FEFO:
          ORDER BY expiry_date ASC, id ASC
          Para cada lote: tomar = MIN(lote.qty_remaining, pendiente)
          Crear un sale_detail por lote consumido
          lots.qty_remaining -= tomado
     b. products.stock -= units_base
     c. Crear stock_movement(VENTA, qty=−units_base, lot_id)
10. Retornar VentaResponseDTO (document, total, cost_total, profit, detalle)

NO se registra forma de pago ni voucher.
El registro documenta la salida de stock y la utilidad generada.
```

### 5.4 Venta a crédito con validación de límite
```
POST /api/ventas { type: CREDITO, customerId, saleDate?, details[] }

Mismos pasos que 5.3, con validaciones adicionales:

ANTES de persistir:
  1. Cliente existe y activo                          ──► no → DAT_001
  2. ¿credit_limit > 0?                               ──► no → SAL_004 (sin cupo)
  3. saldo_actual = Σ(ventas CREDITO PAGADAS) − Σ(abonos vigentes)
  4. ¿saldo_actual + total_nuevo ≤ credit_limit?      ──► no → SAL_003

AL REGISTRAR:
  - sale.customer_id = customerId
  - El importe queda como deuda del cliente hasta que se registre un abono
  - No se crea ningún registro de pago dentro de la venta
```

### 5.5 Anular una venta (revierte stock)
```
PATCH /api/ventas/{id}/anular { reason }

@Transactional:
1. Venta existe                                      ──► no → DAT_001
2. status == PAGADA                                  ──► no → SAL_002
3. Rol == ADMIN                                      ──► no → AUTH_006
4. Por cada sale_detail:
     a. lots.qty_remaining += qty × units_base  (al lote original)
     b. products.stock += qty × units_base
     c. Crear stock_movement(VENTA, qty=+qty_base, reason="Anulación venta {doc}")
        [tipo VENTA con qty positivo = reversión]
5. sale.status = ANULADA
6. Guardar annul_reason, annul_user_id, annulled_at
```

### 5.6 Registrar una merma
```
POST /api/inventario/mermas { productoId, qty, reason, loteId? }

@Transactional:
1. Rol == ADMIN | SUPERVISOR                         ──► no → AUTH_006
2. Producto existe                                   ──► no → DAT_001
3. reason es obligatorio y válido (catálogo §2.1)
4. Si no se indica lotId: seleccionar lotes FEFO con qty_remaining > 0
5. Si el total disponible en lotes < qty solicitada   ──► no → STK_002
6. Por cada lote FEFO:
     a. tomar = MIN(lote.qty_remaining, qty_pendiente)
     b. lote.qty_remaining -= tomar
     c. products.stock -= tomar
     d. Crear stock_movement(MERMA, qty=-tomar, lot_id, reason)
7. Retornar MermaResponseDTO (producto, lote, cantidad, costo perdido)
```

### 5.7 Abono de deuda de cliente
```
POST /api/clientes/{id}/abonos { amount, method, appliedSaleId?, notes? }

@Transactional:
1. Cliente existe y activo                           ──► no → DAT_001
2. amount > 0                                        ──► no → VAL_001
3. saldo_actual = Σ(ventas CREDITO PAGADAS) − Σ(abonos vigentes)
4. ¿saldo_actual ≥ amount?                           ──► no → SAL_005
5. Si appliedSaleId viene informado:
      a. La venta existe, es del cliente, es CREDITO  ──► no → DAT_001 / SAL_002
      b. ¿El abono no supera el saldo de esa venta?    ──► no → SAL_005
6. Crear abono { customer_id, amount, method, applied_sale_id, user_id }
7. Retornar AbonoResponseDTO (saldo anterior, saldo actual)
```

### 5.8 Anular un abono
```
PATCH /api/clientes/{id}/abonos/{abonoId}/anular

@Transactional:
1. Abono existe y no está anulado                    ──► no → DAT_001 / SAL_002
2. Rol == ADMIN                                      ──► no → AUTH_006
3. Verificar que el saldo del cliente cubra el abono revertido
                                                   ──► no → SAL_005
4. abono.annulled_at = now(), annul_user_id = quien anula
5. El saldo del cliente aumenta automáticamente (el abono deja de computar)
```

---

## 6. Excepciones de negocio

| Código | HTTP | Excepción | Mensaje |
|--------|------|-----------|---------|
| `AUTH_001` | 401 | `InvalidCredentialsException` | Credenciales inválidas |
| `AUTH_002` | 423 | `AccountLockedException` | Cuenta bloqueada temporalmente |
| `AUTH_003` | 403 | `AccountInactiveException` | El usuario está inactivo |
| `AUTH_004` | 401 | `TokenExpiredException` | El token ha expirado |
| `AUTH_005` | 401 | `InvalidTokenException` | Token inválido o malformado |
| `AUTH_006` | 403 | `UnauthorizedRoleException` | No tiene permisos para esta operación |
| `VAL_001` | 400 | `BusinessException` | Error de validación de negocio |
| `PROD_001` | 409 | `DuplicateSkuException` | El SKU ya existe |
| `PROD_002` | 409 | `DuplicateBarcodeException` | El código de barras ya existe |
| `PROD_003` | 409 | `ProductInUseException` | El producto tiene movimientos asociados |
| `STK_001` | 422 | `InsufficientStockException` | Stock insuficiente: disponible {0}, solicitado {1} |
| `STK_002` | 422 | `NegativeStockException` | No hay lotes suficientes para la merma |
| `STK_003` | 500 | `InventoryMismatchException` | El stock no cuadra con los movimientos |
| `STK_004` | 422 | `StockBelowMinimumException` | Stock por debajo del mínimo |
| `SAL_001` | 422 | `EmptySaleException` | La venta debe tener al menos un ítem |
| `SAL_002` | 422 | `SaleStateException` | Transición de estado no permitida |
| `SAL_003` | 422 | `PaymentLimitExceededException` | El crédito supera el límite del cliente |
| `SAL_004` | 422 | `NoCreditLimitException` | El cliente no tiene cupo de crédito |
| `SAL_005` | 422 | `InvalidPaymentAmountException` | El abono supera la deuda pendiente |
| `SAL_006` | 422 | `InvalidSaleDateException` | La fecha de venta no puede ser futura |
| `PUR_001` | 422 | `EmptyPurchaseException` | La compra debe tener al menos un ítem |
| `PUR_002` | 422 | `PurchaseStateException` | Transición de compra no permitida |
| `CLI_001` | 409 | `DuplicateDocumentException` | El número de documento ya existe |
| `CLI_002` | 422 | `CustomerHasDebtException` | El cliente tiene deuda pendiente |
| `DAT_001` | 404 | `ResourceNotFoundException` | Recurso no encontrado |
| `DAT_002` | 409 | `DataIntegrityException` | Violación de integridad referencial |

---

## 7. Consistencia y transacciones

| Regla | Implementación |
|-------|----------------|
| Una venta es atómica | `@Transactional` en `VentaServiceImpl.registrar()` |
| No hay overselling | `@Lock(PESSIMISTIC_WRITE)` en `IProductoDAO.findByIdForUpdate()` |
| Cambios concurrentes de stock | `@Version` en la entidad `Producto` (optimistic lock) |
| Kardex append-only | Solo `INSERT`, nunca `DELETE` ni `UPDATE` de movimientos |
| Recálculo de costo dentro de la compra | `@Transactional` en `CompraServiceImpl.recibir()` |
| Sin `REQUIRES_NEW` | Rompe la atomicidad de venta/compra |

```java
// IProductoDAO — el bloqueo pesimista se declara en la interfaz del DAO
public interface IProductoDAO extends JpaRepository<Producto, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id = :id")
    Optional<Producto> findByIdForUpdate(@Param("id") Long id);
}
```

---

## 8. Reglas de validación (Bean Validation)

```java
// ProductoRequestDTO
@NotBlank(message = "El nombre es obligatorio")
@Size(min = 3, max = 150)
private String name;

@NotNull(message = "La categoría es obligatoria")
private Long categoryId;

// ProductPresentationRequestDTO
@NotBlank(message = "El nombre de la presentación es obligatorio")
@Size(max = 60)
private String name;

@NotNull(message = "La cantidad de unidades base es obligatoria")
@Min(value = 1, message = "units_base debe ser mayor a 0")
private Integer unitsBase;

@NotNull
private TipoPresentacion type;   // COMPRA | VENTA

// Solo las presentaciones de VENTA requieren precio
// (validado condicionalmente en el Service: R-C-06)

// VentaRequestDTO
@NotEmpty(message = "La venta debe tener al menos un ítem")
@Valid
private List<SaleDetailRequestDTO> details;

@NotNull(message = "El tipo de venta es obligatorio")
private SaleType type;   // MOSTRADOR | CREDITO

// El cliente es obligatorio solo si type = CREDITO
// (validado condicionalmente en el Service: R-V-13)

// SaleDetailRequestDTO
@NotNull(message = "El producto es obligatorio")
private Long productId;

@NotNull(message = "La presentación es obligatoria")
private Long presentationId;

@NotNull(message = "La cantidad es obligatoria")
@Min(value = 1, message = "La cantidad debe ser mayor a 0")
private Integer qty;

// VentaRequestDTO — registro interno, sin pagos
@NotEmpty(message = "La venta debe tener al menos un ítem")
@Valid
private List<DetalleVentaRequestDTO> details;

@NotNull(message = "El tipo de venta es obligatorio")
private TipoVenta type;   // MOSTRADOR | CREDITO

// El cliente es obligatorio solo si type = CREDITO
// (validado condicionalmente en el Service: R-V-13)

// DetalleVentaRequestDTO
@NotNull(message = "El producto es obligatorio")
private Long productoId;

@NotNull(message = "La presentación es obligatoria")
private Long presentacionId;

@NotNull(message = "La cantidad es obligatoria")
@Min(value = 1, message = "La cantidad debe ser mayor a 0")
private Integer qty;

// DetalleCompraRequestDTO
@NotNull
private Long productoId;

@NotNull
private Long presentacionId;

@NotNull
@Min(1)
private Integer qty;    // cantidad en la presentación de compra

@NotNull
@DecimalMin(value = "0.0001", message = "El costo debe ser mayor a 0")
private BigDecimal unitCost;

// MermaRequestDTO
@NotNull
private Long productoId;

@NotNull
@Min(1)
private Integer qty;

@NotBlank(message = "El motivo de la merma es obligatorio")
private String reason;

// AbonoRequestDTO
@NotNull(message = "El monto es obligatorio")
@DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0")
private BigDecimal amount;

@NotNull(message = "El método de pago es obligatorio")
private MetodoPago method;

private Long appliedSaleId;   // opcional: abono a una venta concreta
```

**Principio:** Bean Validation valida **formato y presencia**. Las **reglas de negocio** (stock, crédito, transiciones) se validan en `XxxServiceImpl`. Nunca en el Controller.

---

## 9. Checklist de implementación por módulo

Para cada entidad, en este orden:

- [ ] Definir reglas en la tabla (ID `R-XX-NN`)
- [ ] Crear `Entity` con `@Version` si aplica
- [ ] Crear `RequestDTO` y `ResponseDTO` con Bean Validation
- [ ] Crear interfaz `IXxxDAO extends JpaRepository<Entidad, Long>` (queries + `@Lock`)
- [ ] Crear `XxxDAOImpl` con las queries derivadas o queries complejas que no se resuelven por convención
- [ ] Crear interfaz `IXxxService` (contrato, sin lógica)
- [ ] Crear `XxxServiceImpl` con las reglas de negocio
- [ ] Validar con excepción propia del catálogo (§6)
- [ ] Crear `XxxController` delgado (delegar todo al Service)
- [ ] Tests: caso feliz + cada regla violada + control de permisos

**Regla de oro:** ninguna regla de negocio se implementa en el `Controller` ni en el `DAO`. Todo pasa por `XxxServiceImpl`.

---

## 10. Trazabilidad

Cada regla `R-XX-NN` debe estar: documentada → implementada → cubierta por test.

| Regla | Implementada en | Test |
|-------|-----------------|------|
| R-A-01 | `AuthServiceImpl.registrar()` | pendiente |
| R-A-06 | `AuthServiceImpl.login()` | pendiente |
| R-C-04 | `ProductoServiceImpl.crear()` | pendiente |
| R-C-06 | `ProductoServiceImpl.crear()` | pendiente |
| R-I-01 | `InventarioServiceImpl.descontar()` | pendiente |
| R-I-04 | `InventarioServiceImpl.verificarInvariante()` | pendiente |
| R-I-10 | `InventarioServiceImpl.consumirLotesFEFO()` | pendiente |
| R-CO-03 | `CompraServiceImpl.recibir()` | pendiente |
| R-V-03 | `VentaServiceImpl.registrar()` | pendiente |
| R-V-05 | `VentaServiceImpl.registrar()` | pendiente |
| R-V-09 | `VentaServiceImpl.anular()` | pendiente |
| R-V-14 | `VentaServiceImpl.registrar()` | pendiente |
| R-CL-06 | `VentaServiceImpl.registrarCredito()` | pendiente |
| R-R-02 | `ReporteServiceImpl.gananciasPorPeriodo()` | pendiente |