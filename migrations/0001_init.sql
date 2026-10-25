-- 0001_init.sql
-- Esquema inicial de D1 (SQLite). Se aplica con: npm run db:migrate:local / db:migrate:remote
--
-- Dos grupos de tablas:
--   1) Contenido editable (categories, options, reglas, modos...), normalizado
--      para que el admin pueda editar opción por opción.
--   2) Publicación y builds: content_versions guarda copias inmutables del
--      contenido (snapshots) y builds guarda lo que comparten los usuarios.
--
-- Los ids de opciones, estatus de clan e ítems de Grab Bag comparten un solo
-- espacio de nombres; esa unicidad cruzada la valida loadContent en la
-- aplicación (SQLite no puede expresarla con una restricción).

/* ======================================================================
   1) Contenido editable
   ====================================================================== */

CREATE TABLE categories (
  key         TEXT    NOT NULL PRIMARY KEY CHECK (key IN (
                'timeline', 'prep', 'race', 'sex', 'appearance', 'specialTraits',
                'clanTier', 'specialBirth', 'aptitude', 'luck', 'soul', 'venerable',
                'grabBagBundles', 'tier1', 'tier2', 'tier3', 'tier4', 'tier5',
                'premiumGu', 'missions', 'drawbacks')),
  kind        TEXT    NOT NULL CHECK (kind IN ('single', 'multiple')),
  position    INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  title       TEXT    NOT NULL CHECK (length(title) > 0),
  description TEXT
) STRICT;

CREATE TABLE options (
  id             TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  category_key   TEXT    NOT NULL REFERENCES categories (key),
  position       INTEGER NOT NULL CHECK (position >= 0),
  name           TEXT    NOT NULL CHECK (length(name) > 0),
  description    TEXT    NOT NULL,
  -- Costo con signo: positivo otorga puntos, negativo los gasta.
  cost           INTEGER NOT NULL,
  image          TEXT,
  negative       INTEGER NOT NULL DEFAULT 0 CHECK (negative IN (0, 1)),
  repeatable     INTEGER NOT NULL DEFAULT 0 CHECK (repeatable IN (0, 1)),
  max_count      INTEGER CHECK (max_count IS NULL OR max_count >= 1),
  -- Solo para bundles de Grab Bag: cuántos ítems se pueden elegir.
  picks          INTEGER CHECK (picks IS NULL OR picks >= 1),
  input_label    TEXT    CHECK (input_label IS NULL OR length(input_label) > 0),
  input_required INTEGER NOT NULL DEFAULT 0 CHECK (input_required IN (0, 1)),
  -- Efectos como JSON (grantsCategories, attainmentCostMultiplier, ...).
  effects_json   TEXT    CHECK (effects_json IS NULL OR json_valid(effects_json)),
  UNIQUE (category_key, position),
  CHECK (max_count IS NULL OR repeatable = 1),
  CHECK (picks IS NULL OR category_key = 'grabBagBundles'),
  CHECK (input_required = 0 OR input_label IS NOT NULL)
) STRICT;

-- Reglas entre opciones. El lado "dueño" (option_id) se borra en cascada;
-- el lado referenciado se protege (RESTRICT): no se puede borrar una opción
-- de la que otras dependen sin quitar antes esas reglas.
CREATE TABLE option_requirements (
  option_id           TEXT    NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  required_option_id  TEXT    NOT NULL REFERENCES options (id) ON DELETE RESTRICT,
  position            INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (option_id, required_option_id),
  CHECK (option_id <> required_option_id)
) STRICT;

CREATE TABLE option_conflicts (
  option_id             TEXT    NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  conflicting_option_id TEXT    NOT NULL REFERENCES options (id) ON DELETE RESTRICT,
  position              INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (option_id, conflicting_option_id),
  CHECK (option_id <> conflicting_option_id)
) STRICT;

CREATE TABLE option_disables (
  option_id TEXT    NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  target    TEXT    NOT NULL CHECK (target IN (
              'timeline', 'prep', 'race', 'sex', 'appearance', 'specialTraits',
              'clanTier', 'specialBirth', 'aptitude', 'luck', 'soul', 'venerable',
              'grabBagBundles', 'tier1', 'tier2', 'tier3', 'tier4', 'tier5',
              'premiumGu', 'missions', 'drawbacks', 'clanStatus')),
  position  INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (option_id, target)
) STRICT;

CREATE TABLE clan_statuses (
  id             TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  tier_option_id TEXT    NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  position       INTEGER NOT NULL CHECK (position >= 0),
  name           TEXT    NOT NULL CHECK (length(name) > 0),
  description    TEXT,
  cost           INTEGER NOT NULL,
  UNIQUE (tier_option_id, position)
) STRICT;

CREATE TABLE difficulty_modes (
  id          TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  position    INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  name        TEXT    NOT NULL CHECK (length(name) > 0),
  points      INTEGER NOT NULL CHECK (points >= 0),
  description TEXT    NOT NULL
) STRICT;

CREATE TABLE paths (
  id       TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
) STRICT;

CREATE TABLE grab_bag_items (
  id          TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  position    INTEGER NOT NULL UNIQUE CHECK (position >= 0),
  name        TEXT    NOT NULL CHECK (length(name) > 0),
  description TEXT    NOT NULL
) STRICT;

-- Precio acumulado de cada nivel de attainment y máximo de caminos por nivel
-- (max_count NULL = sin límite).
CREATE TABLE attainment_levels (
  level     TEXT    NOT NULL PRIMARY KEY CHECK (level IN ('master', 'grandmaster', 'greatgrandmaster')),
  cost      INTEGER NOT NULL CHECK (cost >= 0),
  max_count INTEGER CHECK (max_count IS NULL OR max_count >= 0)
) STRICT;

-- Cada opción adicional (después de la primera) de la categoría cuesta este extra.
CREATE TABLE category_surcharges (
  category_key       TEXT    NOT NULL PRIMARY KEY REFERENCES categories (key),
  per_additional_pick INTEGER NOT NULL CHECK (per_additional_pick >= 0)
) STRICT;

/* ======================================================================
   2) Publicación y builds
   ====================================================================== */

-- Copias inmutables del contenido completo. Los builds apuntan a la versión
-- con la que se crearon, así los enlaces viejos siguen funcionando aunque el
-- contenido cambie. El snapshot es el JSON que consume el motor.
CREATE TABLE content_versions (
  version        TEXT    NOT NULL PRIMARY KEY CHECK (length(version) BETWEEN 1 AND 50),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  snapshot       TEXT    NOT NULL CHECK (json_valid(snapshot)),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_current     INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1))
) STRICT;

-- A lo sumo una versión puede ser la vigente.
CREATE UNIQUE INDEX idx_content_versions_current
  ON content_versions (is_current) WHERE is_current = 1;

-- Builds compartidos. El enlace público es /b/<id>; para editar hace falta el
-- token secreto de edición, del que solo se guarda su hash SHA-256 en hex.
CREATE TABLE builds (
  id              TEXT    NOT NULL PRIMARY KEY
                  CHECK (length(id) = 8 AND id NOT GLOB '*[^0-9A-Za-z]*'),
  content_version TEXT    NOT NULL REFERENCES content_versions (version),
  schema_version  INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  data            TEXT    NOT NULL CHECK (json_valid(data) AND length(data) <= 50000),
  edit_token_hash TEXT    NOT NULL
                  CHECK (length(edit_token_hash) = 64 AND edit_token_hash NOT GLOB '*[^0-9a-f]*'),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
