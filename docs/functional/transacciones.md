# Transacciones

Las transacciones son el registro central de todos tus movimientos de dinero: ingresos, gastos y pagos.

---

## Lista de transacciones

La pantalla principal muestra tus transacciones con:

- Filtros por tipo (ingreso/gasto), categoría y mes
- Búsqueda por descripción
- Paginación (20 por página)
- Total del período visible

---

## Registrar una transacción

Haz clic en **Nueva transacción** y completa el formulario:

### Campos principales

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Tipo** | ✅ | Ingreso o Gasto |
| **Monto** | ✅ | Cantidad en tu moneda (siempre positivo) |
| **Categoría** | ✅ | Selecciona de la lista |
| **Fecha** | ✅ | Fecha real del movimiento |
| **Descripción** | — | Nota libre para identificar la transacción |
| **Cuenta bancaria** | — | Cuenta afectada (actualiza el saldo) |
| **Tarjeta de crédito** | — | Si el gasto fue con tarjeta (no reduce cuenta hasta pagar) |

### Tarjeta de crédito vs. cuenta bancaria

- Si seleccionas una **tarjeta de crédito**, el gasto queda registrado en la tarjeta pero **no reduce el saldo de tu cuenta** hasta que registres el pago de la tarjeta.
- Si seleccionas una **cuenta bancaria**, el saldo se ajusta inmediatamente.

---

## OCR de recibos

Usa el botón de cámara 📷 para fotografiar o subir un recibo. FinTrack usa inteligencia artificial para extraer automáticamente:

- Nombre del comercio
- Monto total
- Fecha
- Productos comprados

Los datos se pre-rellenan en el formulario. Revísalos antes de guardar.

**Formatos aceptados:** Imágenes (JPG, PNG, HEIC) y PDF. Máximo 10 MB.

---

## Editar una transacción

En la lista, haz clic en el ícono de edición (✏️) de cualquier transacción. Se abre el mismo formulario con los datos actuales para que los modifiques.

---

## Eliminar una transacción

Haz clic en el ícono de eliminar (🗑️). Se pedirá confirmación antes de borrar. La eliminación es permanente.

---

## Filtros disponibles

| Filtro | Opciones |
|--------|----------|
| **Tipo** | Todos / Ingresos / Gastos |
| **Categoría** | Todas las categorías activas |
| **Mes** | Selector de mes |
| **Búsqueda** | Texto en la descripción |

---

## Exportar a CSV

Desde la sección de Transacciones puedes descargar un archivo **CSV** con todas tus transacciones. Útil para análisis en Excel o Google Sheets.

---

## Resumen por categoría

La sección **Resumen** agrupa tus gastos por categoría y mes, mostrando cuánto has gastado en cada área. Ideal para identificar dónde va la mayor parte de tu dinero.
