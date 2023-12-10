#!/usr/bin/env node

const { importer, Parser } = require("@dbml/core");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const PROJECT_PATH = process.cwd();
const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");
const PRISMA_DBML_FILE_PATH = path.join(
  PROJECT_PATH,
  "prisma/dbml/schema.dbml"
);

function toKababCase(string) /** string */ {
  return string
    .replace(/_/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

async function sequential(functions) {
  const results = [];
  for (const func of functions) {
    const result = await func();
    results.push(result);
  }
  return results;
}

async function loadConfig(isVerbose) {
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Loading config ${CONFIG_FILE_PATH} ...`);
  }
  const configContent = await fs.promises.readFile(CONFIG_FILE_PATH, "utf8");
  const config = JSON.parse(configContent);
  const { extensionSchemaPath, schemaPath } = config;
  const loadedConfig = {
    schemaPath: path.join(PROJECT_PATH, extensionSchemaPath),
    outputPath: path.join(PROJECT_PATH, schemaPath),
  };
  if (isVerbose) {
    console.log(loadedConfig);
  }
  return loadedConfig;
}

async function getSchemaFilePaths(schemaPath) {
  // read all files in the YAML directory
  const allFileNames = await fs.promises.readdir(schemaPath);

  // filter only YAML files (with .yml or .yaml extension)
  return allFileNames
    .filter((fileName) => {
      const extname = path.extname(fileName).toLowerCase();
      return extname === ".yml" || extname === ".yaml";
    })
    .map((fileName) => path.join(schemaPath, fileName));
}

async function loadSchema(schemaFilePath, isVerbose) {
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Loading schema ${schemaFilePath} ...`);
  }
  const schemaContent = await fs.promises.readFile(schemaFilePath, "utf8");
  return yaml.load(schemaContent);
}

async function loadSchemas(schemaPath, isVerbose) {
  const schemaFilePaths = await getSchemaFilePaths(schemaPath);
  const functions = schemaFilePaths.map(
    (path) => () => loadSchema(path, isVerbose)
  );
  return await sequential(functions);
}

async function loadDbml(dbmlFilePath, isVerbose) {
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Loading dbml ${dbmlFilePath} ...`);
  }
  const content = fs.readFileSync(dbmlFilePath, "utf-8");
  const imported = importer.import(content, "dbml");
  return new Parser().parse(imported, "dbml");
}

const NATIVE_PRISMA_TYPES = {
  String: "string",
  Boolean: "boolean",
  Int: "number",
  BigInt: "bigint",
  Float: "number",
  Decimal: "number",
  DateTime: "Date",
  Bytes: "Buffer",
};

function buildTableSchema(table, enums, refs) {
  const { name: entityName } = table;
  const entity = {
    name: entityName,
    model: `Prisma${entityName}`,
    types: [
      {
        name: `Prisma${entityName}`,
        aliasOf: entityName,
        import: "@prisma/client",
      },
    ],
    fields: [],
  };
  const existingTypeNames = new Set();
  table.fields.forEach((rawField, index) => {
    const { name: fieldName, type } = rawField;
    const { type_name: rawTypeName } = type;
    const field = { id: index + 1, name: fieldName };
    const typeSuffix = rawField.pk || rawField.not_null ? "" : " | null";
    const nativeType = NATIVE_PRISMA_TYPES[rawTypeName];
    if (nativeType) {
      field.type = `${nativeType}${typeSuffix}`;
      field.strategy = "primitive";
    } else if (rawTypeName === "Json") {
      field.type = `PrismaJsonValue${typeSuffix}`;
      field.strategy = "primitive";
      if (!existingTypeNames.has(rawTypeName)) {
        entity.types.push({
          name: "PrismaJsonValue",
          aliasOf: "JsonValue",
          import: "@prisma/client/runtime/library",
        });
        existingTypeNames.add(rawTypeName);
      }
    } else if (enums.has(rawTypeName)) {
      field.type = `Prisma${rawTypeName}${typeSuffix}`;
      field.strategy = "primitive";
      if (!existingTypeNames.has(rawTypeName)) {
        entity.types.push({
          name: `Prisma${rawTypeName}`,
          aliasOf: rawTypeName,
          import: "@prisma/client",
        });
        existingTypeNames.add(rawTypeName);
      }
    } else {
      const sourceTable = entityName;
      const targetTable = rawTypeName;
      const ref = refs.find((ref) =>
        sourceTable < targetTable
          ? ref[0].table === sourceTable && ref[1].table === targetTable
          : ref[0].table === targetTable && ref[1].table === sourceTable
      );
      if (ref) {
        const source = ref.find((r) => r.table === sourceTable);
        const target = ref.find((r) => r.table === targetTable);
        if (target.relation === "*") {
          field.type = `${targetTable}[]`;
        } else {
          field.type = `${targetTable}${typeSuffix}`;
        }
        field.strategy = "association";
        field.sourceFields = source.fields;
        field.targetFields = target.fields;
      }
    }
    if (field.type) {
      entity.fields.push(field);
    }
  });
  return entity;
}

async function loadTableSchemas(isVerbose) {
  const database = await loadDbml(PRISMA_DBML_FILE_PATH, isVerbose);
  const enums = new Set(
    database.schemas.flatMap((s) => s.enums).map((e) => e.name)
  );
  const refs = database.schemas
    .flatMap((s) => s.refs)
    .map((ref) => ref.endpoints.slice(0, 2))
    .map(([a, b]) => (a.tableName < b.tableName ? [a, b] : [b, a]))
    .map(([a, b]) => [
      { table: a.tableName, fields: a.fieldNames, relation: a.relation },
      { table: b.tableName, fields: b.fieldNames, relation: b.relation },
    ]);
  const tables = database.schemas.flatMap((s) => s.tables);
  return tables.map((table) => buildTableSchema(table, enums, refs));
}

function merge(inputSchema, tableSchema, isVerbose) {
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Merging schema ${tableSchema.name} ...`);
  }
  const { name, model } = tableSchema;
  const inputTypes = inputSchema.types ?? [];
  const inputFields = inputSchema.fields ?? [];
  const inputTypeNames = new Set(inputTypes.map((t) => t.name));
  const inputFieldNames = new Set(inputFields.map((f) => f.name));
  const tableTypes = tableSchema.types.filter(
    (f) => !inputTypeNames.has(f.name)
  );
  const tableFields = tableSchema.fields.filter(
    (f) =>
      !inputFieldNames.has(f.name) &&
      inputSchema.skipPrismaFields?.includes(f.name) !== true
  );
  const types = [...tableTypes, ...inputTypes];
  const fields = [...tableFields, ...inputFields];
  return { name, model, ...inputSchema, types, fields };
}

function reconcile(inputSchemas, tableSchemas, isVerbose) {
  if (isVerbose) {
    console.log("[AIREXT/INFO] Reconciling schemas ...");
  }
  const schemaNames = Array.from(
    new Set([
      ...tableSchemas.map((s) => s.name),
      ...inputSchemas.map((s) => s.name),
    ])
  ).sort();
  return schemaNames.map((schemaName) => {
    const tableSchema = tableSchemas.find((s) => s.name === schemaName);
    const inputSchema = inputSchemas.find((s) => s.name === schemaName);
    return !tableSchema
      ? inputSchema
      : !inputSchema
      ? tableSchema
      : merge(inputSchema, tableSchema, isVerbose);
  });
}

async function generateOne(entity, outputPath, isVerbose) {
  const fileName = `${toKababCase(entity.name)}.yml`;
  const outputFilePath = path.join(outputPath, fileName);
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Generating YAML ${outputFilePath} ...`);
  }
  const content = yaml.dump(entity);
  await fs.promises.writeFile(outputFilePath, content, "utf-8");
}

async function generate(isVerbose) {
  // load config
  const config = await loadConfig(isVerbose);
  const inputSchemas = await loadSchemas(config.schemaPath, isVerbose);
  const tableSchemas = await loadTableSchemas(isVerbose);
  const outputSchemas = reconcile(inputSchemas, tableSchemas, isVerbose);

  // Ensure the output directory exists
  await fs.promises.mkdir(config.outputPath, { recursive: true });

  // Generate new YAML files
  const functions = outputSchemas.map(
    (entity) => () => generateOne(entity, config.outputPath, isVerbose)
  );
  await sequential(functions);
}

async function main(argv) {
  const isVerbose = argv.includes("--verbose") || argv.includes("-v");
  await generate(isVerbose);
  console.log("[AIREXT/INFO] Task completed.");
}

main(process.argv.slice(2)).catch((error) => console.error(error));
