# Cuentas bancarias

Las cuentas bancarias representan los lugares donde guardas tu dinero: cuentas corrientes, de ahorros, efectivo e inversiones.

---

## Tipos de cuenta

| Tipo | Uso |
|------|-----|
| **Corriente** | Cuenta bancaria de uso diario |
| **Ahorros** | Cuenta de ahorro bancaria |
| **Efectivo** | Dinero físico en tu billetera |
| **Inversión** | Portafolio de inversiones |

---

## Agregar una cuenta

1. Ve a **Cuentas** → **Nueva cuenta**
2. Completa los datos:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Ej: "Cuenta BAC", "Efectivo", "Ahorros Banrural" |
| **Tipo** | Corriente, Ahorros, Efectivo o Inversión |
| **Saldo inicial** | El monto actual en la cuenta al momento de crearla |
| **Moneda** | La moneda de esta cuenta (puede diferir de tu moneda principal) |
| **Color** | Color para identificarla visualmente |

---

## Cómo se calcula el saldo

El saldo de una cuenta se calcula así:

```
Saldo = Saldo inicial
      + Suma de transacciones de ingreso vinculadas a esta cuenta
      - Suma de transacciones de gasto vinculadas a esta cuenta
      - Pagos de tarjeta de crédito realizados desde esta cuenta
```

> Los gastos registrados **en tarjeta de crédito** (no en cuenta) no afectan el saldo hasta que se registra el pago de la tarjeta.

---

## Ver transacciones de una cuenta

Desde la lista de cuentas, haz clic en una cuenta para ver todas las transacciones asociadas a ella, ordenadas por fecha.

---

## Editar una cuenta

Haz clic en el ícono de edición (✏️) para cambiar el nombre, color o saldo inicial. Ten en cuenta que cambiar el saldo inicial afecta el balance mostrado.

---

## Eliminar una cuenta

Haz clic en el ícono de eliminar (🗑️). Las transacciones vinculadas a esa cuenta permanecen en el historial pero quedan sin cuenta asignada.

---

## Múltiples monedas

Puedes tener cuentas en diferentes monedas. El balance total en el Dashboard usa la moneda preferida configurada en tu perfil. Las cuentas en otras monedas se muestran en su propia moneda sin conversión automática.
