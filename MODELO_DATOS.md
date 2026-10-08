# Modelo de Datos — Chavez Store

> Base de datos: **MySQL 9.3** (compatible con 8+) · Charset: `utf8mb4` · Motor: `InnoDB`
> DDL ejecutable: `api-rest/src/main/resources/db/schema.sql` — **verificado y aplicado**
> Convenciones: tablas y columnas en `snake_case`, PK `BIGINT AUTO_INCREMENT`,
> fechas en `DATETIME`, dinero en `DECIMAL(12,2)`, cantidades en `INT`.
> Reglas aplicadas: `LOGICA_NEGOCIO.md` · Endpoints: `ESQUEMA_API.md`

**Base de datos:** `chavez_store` · Usuario: `root` / `root`

### Convenciones de mapeo JPA
Spring Boot aplica `CamelCaseToUnderscoresNamingStrategy` por defecto, así que los
campos camelCase de las entidades corresponden a las columnas snake_case del DDL:

| Campo Java | Columna MySQL |
|-----------|---------------|
| `sku` | `sku` |
| `baseUnit` | `base_unit` |
| `costAvg` | `cost_avg` |
| `unitsBase` | `units_base` |
| `expiryDate` | `expiry_date` |
| `qtyRemaining` | `qty_remaining` |

`ddl-auto=validate`: si un `@Column` no coincide con la tabla, la aplicación **no arranca**.

---

## 1. Diagrama por módulos

### 1.1 Seguridad
```
users ──┬──< user_roles >──┬── roles
        │
        └──┬── stock_movements (autor)
           └── ventas (registrador)
           └── compras (registrador)
           └── abonos (registrador)
```

### 1.2 Catálogo
```
categories ──┬──< products >──┬── brands
             │                 └──< product_presentations
             │                 └──< lots
             │                 └──< stock_movements
             │                 └──< sale_details
             │                 └──< purchase_details
             └──┬── reportes_ganancia_categoria
```

### 1.3 Inventario (fuente de verdad)
```
products ──< lots ──< stock_movements ──> users
   │           │             │
   │           │             └── ref_table/ref_id → purchases | sale_details | ajuste
   │           └── qty_remaining (cacheado)
   └── stock (cacheado) == SUM(stock_movements.qty)
```

### 1.4 Compras
```
suppliers ──< purchases ──< purchase_details >── products
                    │              │
                    │              └──> product_presentations
                    │              └──> lots (purchase_detail_id)
                    └── abonos_compra?  (no: pagos a proveedor fuera de alcance v1)
```

### 1.5 Ventas (registro interno)
```
customers ──< sales ──< sale_details >── products
     │           │              │          └──> product_presentations
     │           │              └──> lots (lote consumido, snapshot FEFO)
     │           └──> users (registrador)
     │
     └──< abonos >── users (registrador)
          (cobranza de crédito; sin caja, sin voucher al cliente)
```

### 1.6 Tablas eliminadas vs. versión anterior
| Tabla | Estado | Motivo |
|-------|--------|--------|
| `cash_sessions` | **Eliminada** | Las ventas se registran internamente; no hay turno ni arqueo |
| `sale_payments` | **Eliminada** | No se registra el cobro de venta al cliente final |
| `abonos` | **Nueva** | Solo para cobranza de crédito a clientes mayoristas |

---

## 2. Modelo por tabla

### 2.1 `users`
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK, AUTO_INCREMENT |
| username | VARCHAR(50) | NOT NULL, UNIQUE |
| email | VARCHAR(100) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL (BCrypt) |
| full_name | VARCHAR(150) | NOT NULL |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| failed_attempts | TINYINT | NOT NULL, DEFAULT 0 |
| locked_until | DATETIME | NULL |
| last_login_at | DATETIME | NULL |
| created_at / updated_at | DATETIME | NOT NULL, timestamps |

### 2.2 `product_presentations` — clave del dominio de bebidas
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| product_id | BIGINT | FK → products, NOT NULL, ON DELETE CASCADE |
| name | VARCHAR(60) | NOT NULL |
| units_base | INT | NOT NULL, **CHECK > 0** (factor de conversión a unidad base) |
| type | ENUM | `COMPRA`, `VENTA` |
| price | DECIMAL(12,2) | NOT NULL DEFAULT 0 — solo aplica a `VENTA` |
| stock_min | INT | NULL — mínimo en esta presentación |
| active / sort_order | BOOLEAN / INT | |

UK: `(product_id, name, type)`

### 2.3 `lots` — vencimiento y FEFO
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| lot_code | VARCHAR(60) | NOT NULL, UNIQUE |
| product_id | BIGINT | FK → products, NOT NULL, ON DELETE CASCADE |
| purchase_detail_id | BIGINT | FK → purchase_details, NULL, ON DELETE SET NULL |
| entry_date | DATE | NOT NULL |
| expiry_date | DATE | NULL (NULL = sin vencimiento) |
| qty_received | INT | NOT NULL |
| qty_remaining | INT | NOT NULL, **CHECK >= 0** (cacheado) |
| cost_unit | DECIMAL(12,4) | NOT NULL (snapshot del costo al ingreso) |
| active | BOOLEAN | NOT NULL |

**Índice clave para FEFO:** `INDEX idx_lo_fefo (product_id, expiry_date, qty_remaining)`

### 2.4 `stock_movements` — kardex (append only)
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| product_id | BIGINT | FK → products, NOT NULL |
| lot_id | BIGINT | FK → lots, NULL |
| presentation_id | BIGINT | FK → product_presentations, NULL |
| type | ENUM | 8 valores (§3.1) |
| qty | INT | NOT NULL (**con signo**: + entrada, − salida) |
| unit_cost | DECIMAL(12,4) | NOT NULL DEFAULT 0 (snapshot) |
| ref_table | VARCHAR(50) | NULL (`purchases`, `sale_details`, `ajuste`) |
| ref_id | BIGINT | NULL |
| reason | VARCHAR(255) | NULL, **obligatorio si type ∈ {MERMA, AJUSTE_*}** |
| user_id | BIGINT | FK → users, NOT NULL |
| created_at | DATETIME | NOT NULL |

**Nunca `UPDATE` ni `DELETE`.** Una anulación de venta inserta un movimiento con el signo invertido.

### 2.5 `sales` — registro interno de venta
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| document | VARCHAR(20) | NOT NULL, UNIQUE (correlativo `V-2026-000001`) |
| customer_id | BIGINT | FK → customers, NULL (NULL = venta de mostrador) |
| user_id | BIGINT | FK → users, NOT NULL (quién registró) |
| sale_date | DATETIME | NOT NULL |
| type | ENUM | `MOSTRADOR`, `CREDITO` |
| subtotal | DECIMAL(12,2) | NOT NULL |
| total | DECIMAL(12,2) | NOT NULL (**`total == subtotal`**: sin impuestos) |
| cost_total | DECIMAL(12,2) | NOT NULL (snapshot del costo de los ítems) |
| profit | DECIMAL(12,2) | NOT NULL (`subtotal − cost_total`) |
| status | ENUM | `PAGADA`, `ANULADA` |
| annulled_at / annul_reason / annul_user_id | — | NULL, para trazabilidad |

Índices: `idx_sa_date_status (sale_date, status)`, `idx_sa_customer (customer_id)`

### 2.6 `sale_details`
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| sale_id | BIGINT | FK → sales, NOT NULL, ON DELETE CASCADE |
| product_id | BIGINT | FK → products, NOT NULL |
| presentation_id | BIGINT | FK → product_presentations, NOT NULL |
| lot_id | BIGINT | FK → lots, NULL (lote consumido según FEFO) |
| qty | INT | NOT NULL, **CHECK > 0** (en la presentación vendida) |
| units_base | INT | NOT NULL (`qty × presentation.units_base`) |
| unit_price | DECIMAL(12,2) | NOT NULL (**snapshot** del precio) |
| unit_cost | DECIMAL(12,4) | NOT NULL (**snapshot** del `cost_avg`) |
| subtotal | DECIMAL(12,2) | NOT NULL |
| profit | DECIMAL(12,2) | NOT NULL |

### 2.7 `abonos` — cobranza de crédito
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | BIGINT | PK |
| customer_id | BIGINT | FK → customers, NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL, **CHECK > 0** |
| method | ENUM | `EFECTIVO`, `TARJETA_DEBITO`, `TARJETA_CREDITO`, `YAPE`, `PLIN`, `TRANSFERENCIA` |
| applied_sale_id | BIGINT | FK → sales, NULL (abono a venta específica, opcional) |
| notes | VARCHAR(255) | NULL |
| user_id | BIGINT | FK → users, NOT NULL |
| created_at | DATETIME | NOT NULL |
| annulled_at / annul_user_id | — | NULL |

> El método `CREDITO` se **elimina** del enum: ya no es una forma de pago de venta, sino la contraparte de un abono.

---

## 3. Catálogos (ENUM)

### 3.1 Tipos de movimiento de stock
| Valor | Signo | Origen | Descripción |
|-------|-------|--------|-------------|
| `INVENTARIO_INICIAL` | + | Inventario | Carga inicial del sistema |
| `COMPRA` | + | Compras | Ingreso por compra |
| `VENTA` | − | Ventas | Salida por venta (registro interno) |
| `AJUSTE_POSITIVO` | + | Inventario | Corrección con motivo |
| `AJUSTE_NEGATIVO` | − | Inventario | Corrección con motivo |
| `MERMA` | − | Inventario | Pérdida por `VENCIDO`, `QUIEBRE`, `ERROR_TOMA`, `ROBO` |
| `DEVOLUCION_PROVEEDOR` | + | Compras | Retorno al proveedor |

### 3.2 Otros catálogos
| ENUM | Valores |
|------|---------|
| `roles.name` | `ADMIN`, `SUPERVISOR`, `CAJERO`, `ALMACENERO` |
| `sales.status` | `PAGADA`, `ANULADA` |
| `sales.type` | `MOSTRADOR`, `CREDITO` |
| `purchases.status` | `REGISTRADA`, `RECEBIDA`, `ANULADA` |
| `customers.type` | `CONSUMIDOR`, `MAYORISTA` |
| `product_presentations.type` | `COMPRA`, `VENTA` |
| `products.base_unit` | `UNIDAD`, `LT`, `ML` |
| `abonos.method` | `EFECTIVO`, `TARJETA_DEBITO`, `TARJETA_CREDITO`, `YAPE`, `PLIN`, `TRANSFERENCIA` |

---

## 4. DDL — MySQL

> El script ejecutable vive en `api-rest/src/main/resources/db/schema.sql`.
> Aplicar con: `mysql -u root -p < api-rest/src/main/resources/db/schema.sql`

```sql
CREATE DATABASE IF NOT EXISTS chavez_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chavez_store;

-- ═══════════════════════════════════════════════════════════
-- SEGURIDAD
-- ═══════════════════════════════════════════════════════════
CREATE TABLE roles (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(30)  NOT NULL,
    CONSTRAINT uq_roles_name UNIQUE (name),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE users (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    username        VARCHAR(50)   NOT NULL,
    email           VARCHAR(100)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    full_name       VARCHAR(150)  NOT NULL,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    failed_attempts TINYINT       NOT NULL DEFAULT 0,
    locked_until    DATETIME      NULL,
    last_login_at   DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- CATÁLOGO
-- ═══════════════════════════════════════════════════════════
CREATE TABLE categories (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255) NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE brands (
    id     BIGINT      NOT NULL AUTO_INCREMENT,
    name   VARCHAR(80) NOT NULL,
    active BOOLEAN     NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uq_brands_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE products (
    id          BIGINT         NOT NULL AUTO_INCREMENT,
    sku         VARCHAR(50)    NOT NULL,
    barcode     VARCHAR(50)    NULL,
    name        VARCHAR(150)   NOT NULL,
    description TEXT           NULL,
    category_id BIGINT         NOT NULL,
    brand_id    BIGINT         NULL,
    base_unit   ENUM('UNIDAD','LT','ML') NOT NULL DEFAULT 'UNIDAD',
    content_ml  INT            NULL,
    min_stock   INT            NOT NULL DEFAULT 0,
    max_stock   INT            NULL,
    stock       INT            NOT NULL DEFAULT 0,
    cost_avg    DECIMAL(12,4)  NOT NULL DEFAULT 0.0000,
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    version     BIGINT         NOT NULL DEFAULT 0,
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_products_sku     UNIQUE (sku),
    CONSTRAINT uq_products_barcode UNIQUE (barcode),
    CONSTRAINT fk_pr_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_pr_brand    FOREIGN KEY (brand_id)    REFERENCES brands(id),
    CONSTRAINT ck_pr_stock_nonneg CHECK (stock >= 0),
    INDEX idx_pr_category (category_id),
    INDEX idx_pr_active (active),
    INDEX idx_pr_name (name)
) ENGINE=InnoDB;

-- Presentaciones: la clave del dominio de bebidas
CREATE TABLE product_presentations (
    id          BIGINT         NOT NULL AUTO_INCREMENT,
    product_id  BIGINT         NOT NULL,
    name        VARCHAR(60)    NOT NULL,
    units_base  INT            NOT NULL,
    type        ENUM('COMPRA','VENTA') NOT NULL,
    price       DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    stock_min   INT            NULL,
    active      BOOLEAN        NOT NULL DEFAULT TRUE,
    sort_order  INT            NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uq_pp_product_name_type UNIQUE (product_id, name, type),
    CONSTRAINT fk_pp_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT ck_pp_units_positive CHECK (units_base > 0)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- PROVEEDORES Y COMPRAS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE suppliers (
    id       BIGINT        NOT NULL AUTO_INCREMENT,
    document VARCHAR(20)   NOT NULL,
    name     VARCHAR(150)  NOT NULL,
    phone    VARCHAR(30)   NULL,
    email    VARCHAR(100)  NULL,
    address  VARCHAR(200)  NULL,
    active   BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uq_suppliers_document UNIQUE (document)
) ENGINE=InnoDB;

CREATE TABLE purchases (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    supplier_id BIGINT        NOT NULL,
    document    VARCHAR(20)   NOT NULL,
    issue_date  DATE          NOT NULL,
    status      ENUM('REGISTRADA','RECEBIDA','ANULADA') NOT NULL DEFAULT 'REGISTRADA',
    total       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes       TEXT          NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_purchases_document UNIQUE (document),
    CONSTRAINT fk_pu_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    INDEX idx_pu_status (status),
    INDEX idx_pu_date (issue_date)
) ENGINE=InnoDB;

CREATE TABLE purchase_details (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    purchase_id     BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    presentation_id BIGINT        NOT NULL,
    qty_bought      INT           NOT NULL,
    qty_received    INT           NOT NULL DEFAULT 0,
    units_base      INT           NOT NULL,
    unit_cost       DECIMAL(12,4) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_pd_purchase     FOREIGN KEY (purchase_id)     REFERENCES purchases(id) ON DELETE CASCADE,
    CONSTRAINT fk_pd_product      FOREIGN KEY (product_id)      REFERENCES products(id),
    CONSTRAINT fk_pd_presentation FOREIGN KEY (presentation_id) REFERENCES product_presentations(id),
    CONSTRAINT ck_pd_qty_bought   CHECK (qty_bought > 0),
    CONSTRAINT ck_pd_qty_received CHECK (qty_received >= 0)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- LOTES (vencimiento, salida FEFO)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE lots (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    lot_code           VARCHAR(60)   NOT NULL,
    product_id         BIGINT        NOT NULL,
    purchase_detail_id BIGINT        NULL,
    entry_date         DATE          NOT NULL,
    expiry_date        DATE          NULL,
    qty_received       INT           NOT NULL,
    qty_remaining      INT           NOT NULL,
    cost_unit          DECIMAL(12,4) NOT NULL,
    active             BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uq_lots_code UNIQUE (lot_code),
    CONSTRAINT fk_lo_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_lo_pd      FOREIGN KEY (purchase_detail_id)
        REFERENCES purchase_details(id) ON DELETE SET NULL,
    CONSTRAINT ck_lo_qty_rem CHECK (qty_remaining >= 0),
    INDEX idx_lo_fefo (product_id, expiry_date, qty_remaining)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- KARDEX (fuente de verdad del stock — append only)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE stock_movements (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    product_id      BIGINT        NOT NULL,
    lot_id          BIGINT        NULL,
    presentation_id BIGINT        NULL,
    type            ENUM(
        'INVENTARIO_INICIAL','COMPRA','VENTA','AJUSTE_POSITIVO',
        'AJUSTE_NEGATIVO','MERMA','DEVOLUCION_PROVEEDOR') NOT NULL,
    qty             INT           NOT NULL,
    unit_cost       DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    ref_table       VARCHAR(50)   NULL,
    ref_id          BIGINT        NULL,
    reason          VARCHAR(255)  NULL,
    user_id         BIGINT        NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_sm_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_sm_lot     FOREIGN KEY (lot_id)     REFERENCES lots(id),
    CONSTRAINT fk_sm_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    CONSTRAINT ck_sm_reason CHECK (
        type NOT IN ('MERMA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO')
        OR reason IS NOT NULL
    ),
    INDEX idx_sm_product_date (product_id, created_at),
    INDEX idx_sm_type_date (type, created_at),
    INDEX idx_sm_ref (ref_table, ref_id)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- CLIENTES
-- ═══════════════════════════════════════════════════════════
CREATE TABLE customers (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    document     VARCHAR(20)   NOT NULL,
    type         ENUM('CONSUMIDOR','MAYORISTA') NOT NULL DEFAULT 'CONSUMIDOR',
    full_name    VARCHAR(150)  NOT NULL,
    phone        VARCHAR(30)   NULL,
    email        VARCHAR(100)  NULL,
    address      VARCHAR(200)  NULL,
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_customers_document UNIQUE (document),
    INDEX idx_cu_active (active),
    INDEX idx_cu_name (full_name)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- VENTAS — REGISTRO INTERNO (sin caja, sin cobro, sin voucher al cliente)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE sales (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    document        VARCHAR(20)   NOT NULL,
    customer_id     BIGINT        NULL,
    user_id         BIGINT        NOT NULL,
    sale_date       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type            ENUM('MOSTRADOR','CREDITO') NOT NULL DEFAULT 'MOSTRADOR',
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cost_total      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    profit          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status          ENUM('PAGADA','ANULADA') NOT NULL DEFAULT 'PAGADA',
    annulled_at     DATETIME      NULL,
    annul_reason    VARCHAR(255)  NULL,
    annul_user_id   BIGINT        NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_sales_document UNIQUE (document),
    CONSTRAINT fk_sa_customer FOREIGN KEY (customer_id)   REFERENCES customers(id),
    CONSTRAINT fk_sa_user     FOREIGN KEY (user_id)       REFERENCES users(id),
    CONSTRAINT fk_sa_annul    FOREIGN KEY (annul_user_id) REFERENCES users(id),
    INDEX idx_sa_date_status (sale_date, status),
    INDEX idx_sa_customer (customer_id)
) ENGINE=InnoDB;

CREATE TABLE sale_details (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    sale_id         BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    presentation_id BIGINT        NOT NULL,
    lot_id          BIGINT        NULL,
    qty             INT           NOT NULL,
    units_base      INT           NOT NULL,
    unit_price      DECIMAL(12,2) NOT NULL,
    unit_cost       DECIMAL(12,4) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    profit          DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_sd_sale         FOREIGN KEY (sale_id)         REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sd_product      FOREIGN KEY (product_id)      REFERENCES products(id),
    CONSTRAINT fk_sd_presentation FOREIGN KEY (presentation_id) REFERENCES product_presentations(id),
    CONSTRAINT fk_sd_lot          FOREIGN KEY (lot_id)          REFERENCES lots(id),
    CONSTRAINT ck_sd_qty_positive CHECK (qty > 0),
    INDEX idx_sd_product (product_id),
    INDEX idx_sd_sale (sale_id)
) ENGINE=InnoDB;

-- ABONOS: única fuente de cobranza (solo clientes con crédito)
CREATE TABLE abonos (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    customer_id     BIGINT        NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    method          ENUM('EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO',
                         'YAPE','PLIN','TRANSFERENCIA') NOT NULL,
    applied_sale_id BIGINT        NULL,
    notes           VARCHAR(255)  NULL,
    user_id         BIGINT        NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    annulled_at     DATETIME      NULL,
    annul_user_id   BIGINT        NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ab_customer FOREIGN KEY (customer_id)     REFERENCES customers(id),
    CONSTRAINT fk_ab_sale     FOREIGN KEY (applied_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    CONSTRAINT fk_ab_user     FOREIGN KEY (user_id)         REFERENCES users(id),
    CONSTRAINT fk_ab_annul    FOREIGN KEY (annul_user_id)   REFERENCES users(id),
    CONSTRAINT ck_ab_amount_positive CHECK (amount > 0),
    INDEX idx_ab_customer (customer_id),
    INDEX idx_ab_date (created_at)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- DATOS INICIALES
-- ═══════════════════════════════════════════════════════════
INSERT INTO roles (name) VALUES
    ('ADMIN'), ('SUPERVISOR'), ('CAJERO'), ('ALMACENERO');

INSERT INTO categories (name) VALUES
    ('Cervezas'), ('Gaseosas'), ('Aguas'), ('Energizantes'),
    ('Bebidas isotónicas'), ('Licores'), ('Vinos'), ('Otros');

INSERT INTO brands (name) VALUES
    ('Cristal'), ('Cusqueña'), ('Backus'), ('Corona'), ('Heineken'),
    ('Coca-Cola'), ('Pepsi'), ('Inca Kola'), ('Fanta'), ('Sprite'),
    ('Red Bull'), ('Agua Tonic'), ('Bitters');
```

---

## 5. Invariantes

| # | Invariante | Verificación |
|---|-----------|--------------|
| 1 | `products.stock == SUM(stock_movements.qty)` | `GET /api/inventario/verificar` |
| 2 | `lots.qty_remaining == qty_received − Σ(salidas de ese lote)` | Al cerrar cada compra |
| 3 | `sales.total == sales.subtotal` (sin impuestos) | CHECK en el Service |
| 4 | `sales.cost_total == SUM(sale_details.qty × unit_cost)` | Cálculo al registrar |
| 5 | `saldo_cliente == Σ(ventas CREDITO PAGADA) − Σ(abonos no anulados)` | Al registrar venta a crédito y abono |
| 6 | `products.stock >= 0` | CHECK en BD + regla R-I-01 |
| 7 | `lots.qty_remaining >= 0` | CHECK en BD |
| 8 | No existen movimientos de stock huérfanos | Toda venta/compra anulada conserva su detalle histórico |

---

## 6. Correlativos

| Documento | Formato | Secuencia |
|-----------|---------|-----------|
| SKU de producto | `BEB-000001` | Global, autoincremental |
| Documento de cliente | `<DOC>-<N>` (ej: `DNI-12345678`, `RUC-20987654321`) | — |
| Documento de proveedor | `PROV-000001` | Autogenerado si el proveedor no envía |
| Documento de compra | `<documento del proveedor>` o `COM-2026-000001` | Proveedor o autogenerado |
| Documento de venta | `V-2026-000001` | Correlativo por año |

**Implementación:** tabla `sequences(name, last_value)` con `SELECT ... FOR UPDATE` dentro de la transacción, o `AUTO_INCREMENT` por año en tabla dedicda.