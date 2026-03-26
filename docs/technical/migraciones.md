# Migraciones de base de datos

## Esquema inicial

El archivo `database/schema.sql` contiene el esquema completo más el seed de categorías del sistema. Se ejecuta automáticamente al iniciar el contenedor MySQL por primera vez.

---

## Historial de migraciones

Las migraciones incrementales se encuentran en `database/migrations/`. Se ejecutan manualmente en orden numérico.

### `008_categories_management.sql`

Agrega la tabla para gestión de categorías por usuario.

```sql
CREATE TABLE IF NOT EXISTS user_hidden_categories (
  user_id    INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, category_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

**Propósito:** Permite que cada usuario oculte categorías del sistema de su vista sin afectar a otros usuarios. La clave primaria compuesta `(user_id, category_id)` garantiza que no haya duplicados.

---

### `009_budget_planned_income.sql`

Agrega la tabla para ingresos planificados en el presupuesto mensual.

```sql
CREATE TABLE IF NOT EXISTS budget_planned_income (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  month       CHAR(7)      NOT NULL,
  description VARCHAR(120) NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Propósito:** Almacena ingresos únicos (no recurrentes) que el usuario planifica para un mes específico dentro del presupuesto. El campo `month` usa el formato `YYYY-MM`.

---

## Cómo aplicar una migración

### Con Docker

```bash
docker-compose exec mysql mysql -u fintrack_user -psecret fintrack \
  < database/migrations/009_budget_planned_income.sql
```

### Sin Docker (MySQL local)

```bash
mysql -h 127.0.0.1 -u fintrack_user -psecret fintrack \
  < database/migrations/009_budget_planned_income.sql
```

### Desde MySQL Workbench / DBeaver

Abre el archivo `.sql` y ejecútalo sobre la base de datos `fintrack`.

---

## Convenciones para nuevas migraciones

1. Nombrar el archivo `NNN_descripcion_breve.sql` (número secuencial de 3 dígitos).
2. Usar `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para que sean idempotentes.
3. Incluir comentarios explicando el propósito de cada cambio.
4. No modificar `schema.sql` — ese archivo es solo para instalaciones nuevas.

---

## Resetear la base de datos (desarrollo)

```bash
# Con Docker
docker-compose down -v
docker-compose up mysql -d

# Con MySQL local
mysql -u root -p -e "DROP DATABASE fintrack; CREATE DATABASE fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u fintrack_user -psecret fintrack < database/schema.sql
```
