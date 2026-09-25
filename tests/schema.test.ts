import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const schema = readFileSync(fileURLToPath(new URL('database/schema.sql', root)), 'utf8');
const dump = readFileSync(fileURLToPath(new URL('../sis_doc bd.sql', import.meta.url)), 'utf8');
const seed = readFileSync(fileURLToPath(new URL('database/seed.sql', root)), 'utf8');

function getTableColumns(sql: string, tableName: string): string[] {
  const tablePattern = new RegExp(
     `CREATE TABLE(?: IF NOT EXISTS)?\\s+\\x60${tableName}\\x60\\s*\\(([\\s\\S]*?)\\)\\s*ENGINE`,
    'i'
  );
  const match = sql.match(tablePattern);
  assert.ok(match, `Missing CREATE TABLE for ${tableName}`);

  return match[1]
    .split('\n')
    .map((line) => line.trim().replace(/,$/, '').replace(/ AUTO_INCREMENT/g, ''))
    .filter((line) => line.startsWith('`'));
}

const tables = [
  'academia',
  'asignacion_docente',
  'bloque_horario',
  'centro_trabajo',
  'docente',
  'especialidad',
  'grupo',
  'horario_detalle',
  'materia',
  'semestre',
  'status',
  'tipo_usuario',
  'turno',
  'usuario',
];

test('schema table columns match the root SQL dump', () => {
  for (const table of tables) {
    assert.deepEqual(getTableColumns(schema, table), getTableColumns(dump, table), table);
  }
});

test('schema preserves key scheduling constraints and presentation views', () => {
  assert.match(schema, /UNIQUE KEY `uk_asignacion_docente`/);
  assert.match(schema, /UNIQUE KEY `uk_asignacion_dia_bloque`/);
  assert.match(schema, /FOREIGN KEY \(`id_asignacion`\).*ON DELETE CASCADE/);

  for (const view of [
    'vista_academias',
    'vista_asignacion_docente',
    'vista_docente',
    'vista_grupos',
    'vista_materias',
    'vista_semestre',
  ]) {
     assert.match(schema, new RegExp(`CREATE OR REPLACE VIEW \\x60${view}\\x60`));
     assert.match(dump, new RegExp(`VIEW \\x60${view}\\x60`));
  }
});

test('seed inserts only columns present in the canonical schema', () => {
  const insertPattern = /INSERT INTO `([^`]+)`\s*\(([^)]+)\)/g;
  for (const [, table, columnsText] of seed.matchAll(insertPattern)) {
    const schemaColumns = getTableColumns(schema, table).map((definition) => definition.match(/^`([^`]+)`/)?.[1]);
    const seedColumns = [...columnsText.matchAll(/`([^`]+)`/g)].map(([, column]) => column);
    for (const column of seedColumns) {
      assert.ok(schemaColumns.includes(column), `${table}.${column} is not defined in schema.sql`);
    }
  }

  assert.doesNotMatch(seed, /`nombre_turno`|`nombre_materia`|`nombre_grupo`|`activo`|`carga_docente`/);
});