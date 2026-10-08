# Esquema de API REST — Chavez Store

> Backend: `api-rest` (Spring Boot 4.1.1, Java 21) · Base URL: `http://localhost:8080/api`
> Reglas de negocio aplicadas: `LOGICA_NEGOCIO.md` · Errores: `LOGICA_NEGOCIO.md` §6

---

## 1. Convenciones

| Aspecto | Convención |
|---------|-----------|
| Base URL | `/api` |
| Versión | En la URL (`/api/v1`) — deshabilitado por simplicidad interna |
| Formato | JSON (`application/json`) |
| Fecha/hora | ISO-8601: `2026-10-08T14:30:00` |
| Dinero | `DECIMAL(12,2)` → `BigDecimal` |
| Paginación | `?page=0&size=10&sort=nombre,asc` |
| Filtros | Query params opcionales |
| Autenticación | `Authorization: Bearer <token>` |
| Errores | `{ code, message, timestamp, path }` |

**Endpoints públicos:** solo `/api/auth/**`. Todo lo demás requiere JWT válido.

---

## 2. Autenticación

### 2.1 Login
```
POST /api/auth/login
```
```json
// Request
{
  "username": "admin",
  "password": "Admin123"
}
```
```json
// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400000,
  "username": "admin",
  "roles": ["ADMIN"],
  "fullName": "Administrador"
}
```
| Error | Código | Cuándo |
|-------|--------|--------|
| 401 | `AUTH_001` | Credenciales inválidas |
| 403 | `AUTH_003` | Usuario inactivo |
| 423 | `AUTH_002` | Cuenta bloqueada (5 intentos fallidos) |

### 2.2 Usuario actual
```
GET /api/auth/me
```
```json
// Response 200
{
  "username": "cajero01",
  "fullName": "Juan Pérez",
  "roles": ["CAJERO"],
  "lastLoginAt": "2026-10-08T08:00:00"
}
```

### 2.3 Cambiar mi contraseña
```
PUT /api/auth/password
```
```json
// Request
{
  "currentPassword": "Admin123",
  "newPassword": "Nuevo123"
}
```
**Regla:** R-A-03 (mínimo 8 chars, 1 mayús, 1 minús, 1 dígito)

---

## 3. Categorías

```
GET    /api/categorias              → List<CategoriaResponseDTO>
GET    /api/categorias/{id}         → CategoriaResponseDTO
POST   /api/categorias              → 201 CategoriaResponseDTO
PUT    /api/categorias/{id}         → CategoriaResponseDTO
DELETE /api/categorias/{id}         → 204          (desactiva)
```
```json
// CategoriaResponseDTO
{
  "id": 1,
  "name": "Cervezas",
  "description": "Cervezas en botella, lata y packs",
  "active": true
}
```

---

## 4. Marcas

```
GET    /api/marcas                  → List<MarcaResponseDTO>
GET    /api/marcas/{id}             → MarcaResponseDTO
POST   /api/marcas                  → 201 MarcaResponseDTO
PUT    /api/marcas/{id}             → MarcaResponseDTO
DELETE /api/marcas/{id}             → 204
```
```json
{
  "id": 1,
  "name": "Cristal",
  "active": true
}
```

---

## 5. Productos

### 5.1 Listar con filtros
```
GET /api/productos?search=cerveza&categoriaId=1&marcaId=1&stockBajo=true&page=0&size=20
```
```json
// Response 200
{
  "content": [
    {
      "id": 1,
      "sku": "BEB-000001",
      "barcode": "7750885000123",
      "name": "Cerveza Cristal 650ml",
      "description": "Botella de vidrio",
      "categoria": { "id": 1, "name": "Cervezas" },
      "marca": { "id": 1, "name": "Cristal" },
      "baseUnit": "UNIDAD",
      "contentMl": 650,
      "stock": 240,
      "minStock": 48,
      "maxStock": 500,
      "costAvg": 3.2000,
      "presentaciones": [
        { "id": 1, "name": "Caja x24", "unitsBase": 24, "type": "COMPRA", "price": 82.00 },
        { "id": 2, "name": "Unidad",  "unitsBase": 1,  "type": "VENTA",  "price": 4.50 },
        { "id": 3, "name": "Pack x6",  "unitsBase": 6,  "type": "VENTA",  "price": 25.00 }
      ],
      "margenTeorico": 28.89,
      "lotesPorVencer": [
        { "lotCode": "LOTE-BEB000001-001", "qtyRemaining": 40, "expiryDate": "2026-11-15", "diasRestantes": 38 }
      ],
      "active": true
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### 5.2 Crear producto
```
POST /api/productos
```
```json
// Request
{
  "sku": null,
  "barcode": "7750885000123",
  "name": "Cerveza Cristal 650ml",
  "description": "Botella de vidrio",
  "categoriaId": 1,
  "marcaId": 1,
  "baseUnit": "UNIDAD",
  "contentMl": 650,
  "minStock": 48,
  "maxStock": 500,
  "presentaciones": [
    { "name": "Caja x24", "unitsBase": 24, "type": "COMPRA" },
    { "name": "Unidad",  "unitsBase": 1,  "type": "VENTA", "price": 4.50 },
    { "name": "Pack x6",  "unitsBase": 6,  "type": "VENTA", "price": 25.00 }
  ]
}
```
**Reglas:** R-C-01 (SKU autogen si es null), R-C-04 (mínimo una presentación VENTA), R-C-06 (presentaciones VENTA requieren precio)

| Error | Código | Cuándo |
|-------|--------|--------|
| 409 | `PROD_001` | SKU duplicado |
| 409 | `PROD_002` | Código de barras duplicado |

### 5.3 Actualizar producto
```
PUT /api/productos/{id}
```
```json
// Request — mismos campos que crear, sin cambiar categoriaId si ya tiene ventas (R-C-08)
{
  "name": "Cerveza Cristal 650ml",
  "description": "Botella de vidrio (actualizado)",
  "marcaId": 1,
  "minStock": 60,
  "maxStock": 600
}
```

### 5.4 Eliminar (desactiva)
```
DELETE /api/productos/{id}
```
| Error | Código | Cuándo |
|-------|--------|--------|
| 409 | `PROD_003` | Tiene movimientos de stock o ventas |

### 5.5 Cargar stock inicial
```
POST /api/productos/{id}/stock-inicial
```
```json
// Request
{
  "unitsBase": 240,
  "reason": "Inventario inicial de apertura de tienda",
  "lotes": [
    { "lotCode": "LOTE-INI-001", "expiryDate": "2027-03-15", "qty": 160, "costUnit": 3.1000 },
    { "lotCode": "LOTE-INI-002", "expiryDate": "2027-06-20", "qty": 80,  "costUnit": 3.3000 }
  ]
}
```
**Regla:** R-I-06 (rol ADMIN | SUPERVISOR, motivo obligatorio)

---

## 6. Presentaciones

```
GET    /api/productos/{productoId}/presentaciones  → List<PresentacionResponseDTO>
POST   /api/productos/{productoId}/presentaciones  → 201 PresentacionResponseDTO
PUT    /api/presentaciones/{id}                    → PresentacionResponseDTO
DELETE /api/presentaciones/{id}                    → 204
```
```json
// Request
{
  "name": "Pack x12",
  "unitsBase": 12,
  "type": "VENTA",
  "price": 48.00,
  "stockMin": 10,
  "sortOrder": 3
}
```
```json
// Response
{
  "id": 4,
  "productoId": 1,
  "name": "Pack x12",
  "unitsBase": 12,
  "type": "VENTA",
  "price": 48.00,
  "stockMin": 10,
  "active": true
}
```
**Regla:** R-C-05 (units_base > 0), R-C-06 (VENTA requiere precio)

---

## 7. Inventario

### 7.1 Kardex de un producto
```
GET /api/inventario/kardex/{productoId}?desde=2026-01-01&hasta=2026-12-31&page=0&size=50
```
```json
// Response 200
{
  "content": [
    {
      "id": 150,
      "productoId": 1,
      "productoNombre": "Cerveza Cristal 650ml",
      "lote": { "lotCode": "LOTE-BEB000001-001", "expiryDate": "2026-11-15" },
      "type": "VENTA",
      "qty": -6,
      "unitCost": 3.2000,
      "refTable": "sale_details",
      "refId": 88,
      "reason": null,
      "usuario": "cajero01",
      "stockResultante": 234,
      "createdAt": "2026-10-08T14:30:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 3
}
```

### 7.2 Registrar merma
```
POST /api/inventario/mermas
```
```json
// Request
{
  "productoId": 1,
  "qty": 5,
  "lotId": null,
  "reason": "VENCIDO"
}
```
```json
// Response 201
{
  "productoId": 1,
  "productoNombre": "Cerveza Cristal 650ml",
  "qty": 5,
  "costoPerdido": 16.00,
  "lotesAfectados": [
    { "lotId": 1, "lotCode": "LOTE-BEB000001-001", "qty": 5 }
  ],
  "stockRestante": 229,
  "motivo": "VENCIDO"
}
```
**Reglas:** R-I-07 (motivo obligatorio), R-I-08 (solo lotes con existencias)

| Error | Código | Cuándo |
|-------|--------|--------|
| 403 | `AUTH_006` | Rol no autorizado (se requiere ADMIN | SUPERVISOR) |
| 422 | `STK_002` | No hay lotes suficientes |

### 7.3 Ajuste manual de stock
```
POST /api/inventario/ajustes
```
```json
// Request
{
  "productoId": 1,
  "unitsBase": 5,
  "reason": "Corrección por conteo físico de inventario"
}
```
**Reglas:** R-I-06 (rol ADMIN | SUPERVISOR), R-I-01 (resultado no puede ser negativo)

### 7.4 Consultar stock por producto
```
GET /api/inventario/stock/{productoId}
```
```json
{
  "productoId": 1,
  "nombre": "Cerveza Cristal 650ml",
  "stock": 229,
  "stockMin": 48,
  "stockMax": 500,
  "estado": "NORMAL",
  "diasParaVencer": null,
  "lotes": [
    { "lotId": 1, "lotCode": "LOTE-A", "qtyRemaining": 35, "expiryDate": "2026-11-15", "diasRestantes": 38 },
    { "lotId": 2, "lotCode": "LOTE-B", "qtyRemaining": 80, "expiryDate": "2026-12-20", "diasRestantes": 73 }
  ]
}
```

### 7.5 Verificar invariante de stock
```
GET /api/inventario/verificar
```
```json
// Response 200
{
  "verificado": false,
  "productosConDescuadre": [
    { "productoId": 1, "sku": "BEB-000001", "stockCacheado": 229, "stockReal": 225, "diferencia": 4 }
  ]
}
```
**Regla:** R-I-04 (invariante stock == Σ movimientos)

---

## 8. Proveedores

```
GET    /api/proveedores?search=&active=true    → List<ProveedorResponseDTO>
GET    /api/proveedores/{id}                   → ProveedorResponseDTO
POST   /api/proveedores                        → 201 ProveedorResponseDTO
PUT    /api/proveedores/{id}                   → ProveedorResponseDTO
DELETE /api/proveedores/{id}                   → 204
```

---

## 9. Compras

### 9.1 Listar compras
```
GET /api/compras?status=REGISTRADA&proveedorId=1&desde=2026-01-01&hasta=2026-12-31&page=0&size=20
```
```json
{
  "content": [
    {
      "id": 1,
      "document": "PROV-000001",
      "proveedor": { "id": 1, "name": "Distribuidora ABC" },
      "issueDate": "2026-10-05",
      "status": "RECEBIDA",
      "total": 1640.00,
      "details": [
        {
          "id": 1,
          "producto": "Cerveza Cristal 650ml",
          "presentacion": "Caja x24",
          "qtyBought": 10,
          "qtyReceived": 240,
          "unitsBase": 240,
          "unitCost": 3.4167,
          "subtotal": 820.00
        }
      ],
      "createdAt": "2026-10-05T09:00:00"
    }
  ],
  "totalElements": 1
}
```

### 9.2 Registrar compra
```
POST /api/compras
```
```json
// Request
{
  "proveedorId": 1,
  "document": "PROV-000001",
  "issueDate": "2026-10-08",
  "details": [
    {
      "productoId": 1,
      "presentacionId": 1,
      "qty": 10,
      "unitCost": 3.4167
    }
  ]
}
```
```json
// Response 201
{
  "id": 1,
  "document": "PROV-000001",
  "status": "REGISTRADA",
  "total": 820.00
}
```
**Regla:** R-CO-07 (total calculado en servidor)

### 9.3 Recibir compra
```
POST /api/compras/{id}/recibir
```
Sin cuerpo. El sistema:
1. Crea un lote por ítem
2. Suma stock al producto
3. Recalcula costo promedio ponderado (fórmula R-CO-03)
4. Crea movimiento `COMPRA` por ítem
5. Cambia status a `RECEBIDA`

```json
// Response 200
{
  "id": 1,
  "document": "PROV-000001",
  "status": "RECEBIDA",
  "total": 820.00,
  "lotesCreados": [
    {
      "productoId": 1,
      "lotCode": "LOTE-BEB000001-001",
      "expiryDate": "2027-03-15",
      "qtyReceived": 240,
      "costUnit": 3.4167
    }
  ],
  "productosActualizados": [
    {
      "productoId": 1,
      "stockAnterior": 200,
      "stockNuevo": 440,
      "costoAnterior": 3.0000,
      "costoNuevo": 3.2000
    }
  ]
}
```
**Reglas:** R-CO-02 (rol ADMIN | ALMACENERO), R-CO-03 (recibe compra)

| Error | Código | Cuándo |
|-------|--------|--------|
| 403 | `AUTH_006` | Rol no autorizado |
| 422 | `PUR_002` | Compra no está en estado REGISTRADA |

### 9.4 Anular compra
```
PATCH /api/compras/{id}/anular
```
Sin cuerpo. Genera `DEVOLUCION_PROVEEDOR` y recalcula costo promedio.
**Regla:** R-CO-05 (solo ADMIN puede anular compra RECIBIDA)

---

## 10. Ventas — registro interno

> La venta es un **asiento interno**: documenta la salida de stock y la utilidad generada.
> **No** registra forma de pago, **no** genera voucher, **no** atiende al cliente final.
> El único registro de dinero recibido son los `abonos` de clientes con crédito (§11.4).

### 10.1 Registrar venta (mostrador)
```
POST /api/ventas
```
```json
// Request
{
  "type": "MOSTRADOR",
  "clienteId": null,
  "saleDate": null,
  "detalles": [
    {
      "productoId": 1,
      "presentacionId": 3,
      "qty": 2
    },
    {
      "productoId": 5,
      "presentacionId": 8,
      "qty": 1
    }
  ]
}
```
```json
// Response 201
{
  "id": 1,
  "document": "V-2026-000001",
  "type": "MOSTRADOR",
  "cliente": null,
  "registradoPor": "admin",
  "fecha": "2026-10-08T14:30:00",
  "subtotal": 50.00,
  "total": 50.00,
  "costTotal": 30.00,
  "profit": 20.00,
  "status": "PAGADA",
  "detalles": [
    {
      "producto": "Cerveza Cristal 650ml",
      "presentacion": "Pack x6",
      "lote": "LOTE-BEB000001-001",
      "qty": 2,
      "unitsBase": 12,
      "unitPrice": 25.00,
      "unitCost": 3.2000,
      "subtotal": 50.00,
      "profit": 11.60
    }
  ]
}
```
**Reglas aplicadas:** R-V-01 (mínimo un ítem), R-V-03 (total en servidor), R-V-05 (stock suficiente), R-V-06 (consume lotes FEFO), R-V-14 (sin pagos), R-V-16 (`user_id` obligatorio)

| Error | Código | HTTP | Cuándo |
|-------|--------|------|--------|
| 422 | `SAL_001` | 422 | Venta sin ítems |
| 422 | `SAL_002` | 422 | Producto o presentación inactiva / sin precio |
| 422 | `STK_001` | 422 | Stock insuficiente |
| 422 | `SAL_006` | 422 | `saleDate` en el futuro |

### 10.2 Venta a crédito
```json
// Request
{
  "type": "CREDITO",
  "clienteId": 1,
  "detalles": [
    { "productoId": 1, "presentacionId": 3, "qty": 4 }
  ]
}
```
Sin `payments`. El importe queda como deuda del cliente hasta que se registre un abono.

**Reglas:** R-V-13 (cliente con cupo), R-CL-06 (saldo + total ≤ credit_limit)

| Error | Código | HTTP | Cuándo |
|-------|--------|------|--------|
| 422 | `SAL_004` | 422 | Cliente sin cupo de crédito (`credit_limit = 0`) |
| 422 | `SAL_003` | 422 | Supera el límite de crédito |
| 404 | `DAT_001` | 404 | Cliente no existe o está inactivo |

### 10.3 Consultar ventas
```
GET /api/ventas?type=CREDITO&status=PAGADA&clienteId=1&desde=2026-10-01&hasta=2026-10-31&page=0&size=20
```

### 10.4 Ver venta
```
GET /api/ventas/{id}
```
Detalle completo con lote, costo y profit por ítem.

### 10.5 Anular venta
```
PATCH /api/ventas/{id}/anular
```
```json
// Request
{
  "reason": "Error de registro — se contó producto equivocado"
}
```
Genera movimientos de stock inversos y restaura los lotes originales.
**Reglas:** R-V-09 (revierte stock), R-V-10 (solo ADMIN)

| Error | Código | HTTP | Cuándo |
|-------|--------|------|--------|
| 403 | `AUTH_006` | 403 | Usuario no es ADMIN |
| 422 | `SAL_002` | 422 | Venta ya está ANULADA |

---

## 11. Clientes

### 11.1 CRUD clientes
```
GET    /api/clientes?search=&type=MAYORISTA&active=true    → List<ClienteResponseDTO>
GET    /api/clientes/{id}                                  → ClienteResponseDTO
POST   /api/clientes                                       → 201 ClienteResponseDTO
PUT    /api/clientes/{id}                                  → ClienteResponseDTO
DELETE /api/clientes/{id}                                  → 204
```

### 11.2 Ver detalle con historial
```
GET /api/clientes/{id}/detalle
```
```json
{
  "id": 1,
  "document": "DNI-12345678",
  "type": "MAYORISTA",
  "fullName": "Distribuidora XYZ S.R.L.",
  "phone": "987654321",
  "creditLimit": 5000.00,
  "saldoActual": 2350.00,
  "disponible": 2650.00,
  "active": true,
  "ventasUltimos30Dias": [
    {
      "document": "V-2026-000045",
      "fecha": "2026-10-08T10:15:00",
      "total": 250.00,
      "profit": 62.50
    }
  ]
}
```

### 11.3 Registrar abono
```
POST /api/clientes/{id}/abonos
```
```json
// Request
{
  "amount": 500.00,
  "method": "EFECTIVO",
  "appliedSaleId": null,
  "notes": "Pago parcial del mes"
}
```
```json
// Response 201
{
  "id": 1,
  "clienteId": 1,
  "clienteNombre": "Distribuidora XYZ S.R.L.",
  "amount": 500.00,
  "method": "EFECTIVO",
  "appliedSaleId": null,
  "saldoAnterior": 2350.00,
  "saldoActual": 1850.00,
  "registradoPor": "cajero01",
  "fecha": "2026-10-08T14:30:00"
}
```
**Reglas:** R-CL-07 (reduce saldo), R-CL-10 (no supera la deuda), R-CL-11 (`appliedSaleId` opcional)

| Error | Código | HTTP | Cuándo |
|-------|--------|------|--------|
| 422 | `SAL_005` | 422 | El abono supera la deuda pendiente |
| 404 | `DAT_001` | 404 | Cliente o venta no existen |

### 11.4 Listar abonos de un cliente
```
GET /api/clientes/{id}/abonos?page=0&size=20
```

### 11.5 Anular abono
```
PATCH /api/clientes/{id}/abonos/{abonoId}/anular
```
Sin cuerpo. El saldo del cliente vuelve a aumentar.
**Regla:** R-CL-09 (solo ADMIN)

| Error | Código | HTTP | Cuándo |
|-------|--------|------|--------|
| 403 | `AUTH_006` | 403 | Usuario no es ADMIN |
| 422 | `SAL_005` | 422 | El saldo no cubre la reversión |

### 11.6 Modificar límite de crédito
```
PUT /api/clientes/{id}/limite-credito
```
```json
{ "creditLimit": 5000.00 }
```
**Regla:** R-CL-04 (solo ADMIN)

---

## 12. Reportes

### 12.1 Ganancia por período
```
GET /api/reportes/ganancias?desde=2026-10-01&hasta=2026-10-31
```
```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
  "totales": {
    "ventasCount": 245,
    "unidadesVendidas": 1840,
    "ingresos": 9250.00,
    "costoVentas": 5400.00,
    "mermas": 180.00,
    "utilidadNeta": 3670.00,
    "margenPct": 39.68
  },
  "porDia": [
    { "fecha": "2026-10-01", "ventasCount": 8, "ingresos": 320.00, "costo": 180.00, "mermas": 0.00, "utilidad": 140.00, "margenPct": 43.75 },
    { "fecha": "2026-10-02", "ventasCount": 12, "ingresos": 480.00, "costo": 270.00, "mermas": 12.00, "utilidad": 198.00, "margenPct": 41.25 }
  ],
  "porTipoVenta": [
    { "type": "MOSTRADOR", "ventasCount": 245, "total": 9250.00, "porcentaje": 100.00 },
    { "type": "CREDITO", "ventasCount": 12, "total": 1150.00, "porcentaje": 12.43 }
  ],
  "recaudadoAbonos": 800.00
}
```
> `recaudadoAbonos` proviene de la tabla `abonos`, no de las ventas: es el único dinero registrado por el sistema.

**Reglas:** R-R-01 (solo PAGADA), R-R-02 (utilidad = ingresos − costo − mermas), R-R-03 (snapshot de costo)

### 12.2 Ganancia por categoría
```
GET /api/reportes/ganancias/categoria?desde=2026-10-01&hasta=2026-10-31
```
```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
  "categorias": [
    {
      "categoriaId": 1,
      "categoriaNombre": "Cervezas",
      "ventasCount": 120,
      "unidadesVendidas": 720,
      "litrosVendidos": 468.0,
      "ingresos": 4320.00,
      "costoVentas": 2304.00,
      "mermas": 120.00,
      "utilidad": 1896.00,
      "margenPct": 43.89,
      "margenRealPct": 41.11,
      "participacionIngresosPct": 46.70
    },
    {
      "categoriaId": 2,
      "categoriaNombre": "Gaseosas",
      "ventasCount": 85,
      "unidadesVendidas": 450,
      "litrosVendidos": 225.0,
      "ingresos": 1800.00,
      "costoVentas": 1170.00,
      "mermas": 48.00,
      "utilidad": 582.00,
      "margenPct": 32.33,
      "margenRealPct": 29.67,
      "participacionIngresosPct": 19.46
    }
  ]
}
```
**Regla:** R-R-04 (agrupa por categoría), R-R-05 (margen real vs teórico)

### 12.3 Ganancia por producto
```
GET /api/reportes/ganancias/producto?desde=2026-10-01&hasta=2026-10-31&categoriaId=1&orden=utilidad&limite=50
```
```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
  "productos": [
    {
      "productoId": 1,
      "sku": "BEB-000001",
      "nombre": "Cerveza Cristal 650ml",
      "categoria": "Cervezas",
      "unidadesVendidas": 240,
      "litrosVendidos": 156.0,
      "ingresos": 1800.00,
      "costo": 960.00,
      "mermas": 48.00,
      "utilidad": 792.00,
      "margenPct": 44.00,
      "margenRealPct": 41.33,
      "stockActual": 229,
      "rotacion": 4.2,
      "diasSinVenta": 0
    }
  ],
  "totalProductos": 45
}
```

### 12.4 Ventas por hora (demanda por franja)
```
GET /api/reportes/ventas-por-hora?desde=2026-10-01&hasta=2026-10-31
```
```json
{
  "porHora": [
    { "hora": 10, "ventasCount": 5, "ingresos": 180.00, "ticketPromedio": 36.00 },
    { "hora": 11, "ventasCount": 8, "ingresos": 320.00, "ticketPromedio": 40.00 },
    { "hora": 20, "ventasCount": 25, "ingresos": 1200.00, "ticketPromedio": 48.00 },
    { "hora": 22, "ventasCount": 18, "ingresos": 900.00, "ticketPromedio": 50.00 }
  ],
  "horaPico": 20,
  "horaBaja": 10
}
```
**Regla:** R-R-09

### 12.5 Stock crítico y por vencer
```
GET /api/reportes/stock?diasParaVencer=30
```
```json
{
  "stockCritico": [
    { "productoId": 8, "sku": "BEB-000008", "nombre": "Gaseosa 500ml", "stock": 12, "stockMin": 24, "faltante": 12 }
  ],
  "porVencer": [
    { "productoId": 1, "nombre": "Cerveza Cristal 650ml", "lotCode": "LOTE-A", "qty": 35, "expiryDate": "2026-11-15", "diasRestantes": 38, "valor": 112.00 }
  ],
  "sinVencimiento": [],
  "resumen": {
    "productosStockCritico": 5,
    "lotesPorVencer": 8,
    "valorPorVencer": 340.50
  }
}
```
**Regla:** R-R-07

### 12.6 Mermas y pérdidas
```
GET /api/reportes/mermas?desde=2026-10-01&hasta=2026-10-31&motivo=VENCIDO
```
```json
{
  "periodo": { "desde": "2026-10-01", "hasta": "2026-10-31" },
  "totales": { "unidades": 42, "costoPerdido": 180.00 },
  "porMotivo": [
    { "motivo": "VENCIDO", "unidades": 30, "costoPerdido": 120.00, "porcentaje": 66.67 },
    { "motivo": "QUIEBRE", "unidades": 8, "costoPerdido": 45.00, "porcentaje": 25.00 },
    { "motivo": "ERROR_TOMA", "unidades": 4, "costoPerdido": 15.00, "porcentaje": 8.33 }
  ],
  "porProducto": [
    { "productoId": 1, "nombre": "Cerveza Cristal 650ml", "unidades": 20, "costoPerdido": 64.00, "mermaPct": 4.2 }
  ]
}
```
**Regla:** R-R-06

### 12.7 Cuentas por cobrar
```
GET /api/reportes/cuentas-por-cobrar
```
```json
{
  "clientes": [
    {
      "clienteId": 1,
      "nombre": "Distribuidora XYZ S.R.L.",
      "document": "RUC-20987654321",
      "creditLimit": 5000.00,
      "saldoTotal": 2350.00,
      "disponible": 2650.00,
      "antiguedad": {
        "actual": 450.00,
        "dias30": 800.00,
        "dias60": 600.00,
        "dias90": 500.00
      },
      "ultimaVenta": "2026-10-08",
      "ultimoPago": "2026-09-28"
    }
  ],
  "resumen": {
    "clientesConDeuda": 8,
    "saldoTotal": 8420.00,
    "deudaMas90Dias": 1200.00
  }
}
```
**Regla:** R-R-08

### 12.8 Ventas del día (total diario)
```
GET /api/reportes/ventas-del-dia?fecha=2026-10-08
```
```json
{
  "fecha": "2026-10-08",
  "resumen": {
    "ventasCount": 32,
    "ingresosTotal": 1280.00,
    "costoTotal": 768.00,
    "utilidad": 512.00,
    "creditoOtorgado": 100.00,
    "abonosRecibidos": 250.00
  },
  "porTipoVenta": [
    { "type": "MOSTRADOR", "ventasCount": 30, "total": 1180.00, "porcentaje": 92.19 },
    { "type": "CREDITO", "ventasCount": 2, "total": 100.00, "porcentaje": 7.81 }
  ],
  "abonosDelDia": [
    { "cliente": "Distribuidora XYZ S.R.L.", "amount": 250.00, "method": "EFECTIVO" }
  ],
  "topProductos": [
    { "producto": "Cerveza Cristal 650ml", "unidades": 48, "ingresos": 216.00 }
  ]
}
```
> `ingresosTotal` y `utilidad` provienen de las ventas. `abonosRecibidos` proviene de `abonos`.

### 12.9 Exportar a Excel / PDF
```
GET /api/reportes/ganancias/exportar?formato=excel&desde=2026-10-01&hasta=2026-10-31
GET /api/reportes/ganancias/exportar?formato=pdf&desde=2026-10-01&hasta=2026-10-31
```

---

## 13. Tabla de endpoints

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/auth/me` | Usuario actual | Autenticado |
| PUT | `/api/auth/password` | Cambiar contraseña | Autenticado |
| GET | `/api/categorias` | Listar categorías | Autenticado |
| POST | `/api/categorias` | Crear categoría | ADMIN |
| GET | `/api/marcas` | Listar marcas | Autenticado |
| GET | `/api/productos` | Listar productos | Autenticado |
| POST | `/api/productos` | Crear producto | ADMIN, SUPERVISOR |
| PUT | `/api/productos/{id}` | Actualizar producto | ADMIN, SUPERVISOR |
| DELETE | `/api/productos/{id}` | Desactivar producto | ADMIN |
| POST | `/api/productos/{id}/stock-inicial` | Carga de stock inicial | ADMIN, SUPERVISOR |
| GET | `/api/productos/{id}/presentaciones` | Ver presentaciones | Autenticado |
| POST | `/api/productos/{id}/presentaciones` | Agregar presentación | ADMIN |
| PUT | `/api/presentaciones/{id}` | Actualizar presentación | ADMIN |
| GET | `/api/inventario/kardex/{id}` | Kardex de un producto | Autenticado |
| GET | `/api/inventario/stock/{id}` | Stock y lotes de un producto | Autenticado |
| POST | `/api/inventario/mermas` | Registrar merma | ADMIN, SUPERVISOR |
| POST | `/api/inventario/ajustes` | Ajuste manual | ADMIN, SUPERVISOR |
| GET | `/api/inventario/verificar` | Verificar invariante | ADMIN |
| GET | `/api/proveedores` | Listar proveedores | Autenticado |
| POST | `/api/proveedores` | Crear proveedor | ADMIN, ALMACENERO |
| GET | `/api/compras` | Listar compras | Autenticado |
| POST | `/api/compras` | Registrar compra | ADMIN, ALMACENERO |
| POST | `/api/compras/{id}/recibir` | Recibir compra (crea lotes) | ADMIN, ALMACENERO |
| PATCH | `/api/compras/{id}/anular` | Anular compra | ADMIN |
| POST | `/api/ventas` | Registrar venta interna | ADMIN, CAJERO |
| GET | `/api/ventas` | Listar ventas | Autenticado |
| GET | `/api/ventas/{id}` | Ver venta | Autenticado |
| PATCH | `/api/ventas/{id}/anular` | Anular venta (revierte stock) | ADMIN |
| GET | `/api/clientes` | Listar clientes | Autenticado |
| POST | `/api/clientes` | Crear cliente | ADMIN, CAJERO |
| PUT | `/api/clientes/{id}` | Actualizar cliente | ADMIN, CAJERO |
| GET | `/api/clientes/{id}/detalle` | Detalle + historial | Autenticado |
| POST | `/api/clientes/{id}/abonos` | Registrar abono | ADMIN, CAJERO |
| GET | `/api/clientes/{id}/abonos` | Listar abonos | Autenticado |
| PATCH | `/api/clientes/{id}/abonos/{abonoId}/anular` | Anular abono | ADMIN |
| PUT | `/api/clientes/{id}/limite-credito` | Modificar límite de crédito | ADMIN |
| GET | `/api/reportes/ganancias` | Ganancia por período | ADMIN, SUPERVISOR |
| GET | `/api/reportes/ganancias/categoria` | Ganancia por categoría | ADMIN, SUPERVISOR |
| GET | `/api/reportes/ganancias/producto` | Ganancia por producto | ADMIN, SUPERVISOR |
| GET | `/api/reportes/ventas-por-hora` | Ventas por hora | ADMIN, SUPERVISOR |
| GET | `/api/reportes/stock` | Stock crítico y por vencer | ADMIN, SUPERVISOR, ALMACENERO |
| GET | `/api/reportes/mermas` | Mermas y pérdidas | ADMIN, SUPERVISOR |
| GET | `/api/reportes/cuentas-por-cobrar` | Cuentas por cobrar | ADMIN |
| GET | `/api/reportes/ventas-del-dia` | Total vendido por día | ADMIN, SUPERVISOR |
| GET | `/api/reportes/ganancias/exportar` | Exportar Excel/PDF | ADMIN, SUPERVISOR |

---

## 14. Formato de error

Todas las respuestas de error usan el mismo formato:
```json
{
  "code": "STK_001",
  "message": "Stock insuficiente: disponible 5, solicitado 10",
  "timestamp": "2026-10-08T14:30:00",
  "path": "/api/ventas"
}
```
Códigos completos en `LOGICA_NEGOCIO.md` §6.