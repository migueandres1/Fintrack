# Deudas y préstamos

El módulo de Deudas te permite gestionar préstamos formales con cuota mensual y tasa de interés, con cálculo automático de amortización.

---

## ¿Cuándo usar Deudas vs. Tarjetas?

- **Deudas** → Préstamos bancarios, préstamos personales, créditos hipotecarios o vehiculares. Tienen tasa de interés anual y cuota mensual fija.
- **Tarjetas de crédito** → Líneas de crédito rotativas para compras del día a día.

---

## Agregar una deuda

Ve a **Deudas** → **Nueva deuda** y completa:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Ej: "Préstamo Banco Industrial" |
| **Saldo inicial** | Monto original del préstamo |
| **Tasa de interés anual** | En decimal (ej: 0.18 para 18%) |
| **Cuota mensual** | Pago mensual programado |
| **Día de pago** | Día del mes en que vence la cuota |
| **Fecha de inicio** | Cuándo comenzó el préstamo |

---

## Cómo funciona la amortización

Cada pago mensual se divide en dos partes:

```
Interés mensual = Saldo pendiente × (Tasa anual / 12)
Abono a capital = Cuota mensual − Interés mensual
Saldo pendiente = Saldo anterior − Abono a capital
```

FinTrack calcula esto automáticamente cuando registras un pago.

---

## Registrar un pago

1. Abre la deuda desde la lista
2. Haz clic en **Registrar pago**
3. Ingresa:
   - **Monto total pagado** — normalmente igual a la cuota mensual
   - **Fecha del pago**
   - **Abono extra a capital** — si pagaste más de la cuota para reducir el saldo más rápido

El sistema recalcula automáticamente el saldo pendiente y actualiza la proyección de pagos.

---

## Historial de pagos

Cada deuda muestra el historial completo de pagos con:
- Fecha de cada pago
- Monto total pagado
- Desglose: capital + intereses
- Saldo después del pago

---

## Proyección de amortización

FinTrack genera una tabla de amortización proyectada mostrando cuánto pagarás de capital e intereses en cada cuota futura y en qué fecha aproximada terminarás de pagar la deuda.

---

## Pagos planificados

Puedes agregar **pagos futuros planificados** para registrar pagos que ya están programados (ej: un débito automático del próximo mes). Aparecen en el calendario de pagos y en el módulo de Presupuesto como compromiso.

---

## Marcar una deuda como inactiva

Cuando una deuda esté completamente pagada, puedes marcarla como inactiva. Deja de aparecer en los resúmenes activos pero se conserva en el historial.

---

## Deuda y Presupuesto

En la sección de [Presupuesto](presupuesto.md) → pestaña **Compromisos**, verás todas tus deudas activas con la cuota mensual. Desde ahí puedes importar la cuota directamente al presupuesto del mes con un solo clic.
