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

function buildTableSchema(table, enums) {
  const schema = {
    entity: table.name,
    model: `Prisma${table.name}`,
    types: [
      {
        name: `Prisma${table.name}`,
        aliasOf: table.name,
        import: "@prisma/client",
      },
    ],
    fields: [],
  };
  const existingTypeNames = new Set();
  table.fields.forEach((rawField, index) => {
    const field = { id: index + 1, name: rawField.name };
    const rawTypeName = rawField.type.type_name;
    const typeSuffix = rawField.pk || rawField.not_null ? "" : " | null";
    switch (rawTypeName) {
      case "String":
        field.type = `string${typeSuffix}`;
        break;
      case "Boolean":
        field.type = `boolean${typeSuffix}`;
        break;
      case "Int":
        field.type = `number${typeSuffix}`;
        break;
      case "BigInt":
        field.type = `bigint${typeSuffix}`;
        break;
      case "Float":
        field.type = `number${typeSuffix}`;
        break;
      case "Decimal":
        field.type = `number${typeSuffix}`;
        break;
      case "DateTime":
        field.type = `Date${typeSuffix}`;
        break;
      case "Bytes":
        field.type = `Buffer${typeSuffix}`;
        break;
      case "Json":
        field.type = `PrismaJsonValue${typeSuffix}`;
        if (!existingTypeNames.has(rawTypeName)) {
          schema.types.push({
            name: "PrismaJsonValue",
            aliasOf: "JsonValue",
            import: "@prisma/client/runtime/library",
          });
          existingTypeNames.add(rawTypeName);
        }
        break;
      default:
        if (enums.has(rawTypeName)) {
          field.type = `Prisma${rawTypeName}${typeSuffix}`;
          if (!existingTypeNames.has(rawTypeName)) {
            schema.types.push({
              name: `Prisma${rawTypeName}`,
              aliasOf: rawTypeName,
              import: "@prisma/client",
            });
            existingTypeNames.add(rawTypeName);
          }
        }
    }
    if (field.type) {
      schema.fields.push({ ...field, strategy: "primitive" });
    }
  });
  return schema;
}

function merge(inputSchema, tableSchema, isVerbose) {
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Merging schema ${tableSchema.entity} ...`);
  }
  const { entity, model } = tableSchema;
  const inputTypes = inputSchema.types ?? [];
  const inputFields = inputSchema.fields ?? [];
  const inputTypeNames = new Set(inputTypes.map((t) => t.name));
  const inputFieldNames = new Set(inputFields.map((f) => f.name));
  const tableTypes = tableSchema.types.filter(
    (f) => !inputTypeNames.has(f.name)
  );
  const tableFields = tableSchema.fields.filter(
    (f) => !inputFieldNames.has(f.name)
  );
  const types = [...tableTypes, ...inputTypes];
  const fields = [...tableFields, ...inputFields];
  return { entity, model, ...inputSchema, types, fields };
}

function reconcile(inputSchemas, database, isVerbose) {
  if (isVerbose) {
    console.log("[AIREXT/INFO] Reconciling schemas ...");
  }
  const tables = database.schemas.flatMap((s) => s.tables);
  const enums = new Set(
    database.schemas.flatMap((s) => s.enums).map((e) => e.name)
  );
  const tableSchemas = tables.map((table) => buildTableSchema(table, enums));
  const schemaNames = Array.from(
    new Set([
      ...tableSchemas.map((s) => s.entity),
      ...inputSchemas.map((s) => s.entity),
    ])
  ).sort();
  return schemaNames.map((schemaName) => {
    const tableSchema = tableSchemas.find((s) => s.entity === schemaName);
    const inputSchema = inputSchemas.find((s) => s.entity === schemaName);
    return !tableSchema
      ? inputSchema
      : !inputSchema
      ? tableSchema
      : merge(inputSchema, tableSchema, isVerbose);
  });
}

async function generateOne(schema, outputPath, isVerbose) {
  const fileName = `${toKababCase(schema.entity)}.yml`;
  const outputFilePath = path.join(outputPath, fileName);
  if (isVerbose) {
    console.log(`[AIREXT/INFO] Generating YAML ${outputFilePath} ...`);
  }
  const content = yaml.dump(schema);
  await fs.promises.writeFile(outputFilePath, content, "utf-8");
}

async function generate(isVerbose) {
  // load config
  const config = await loadConfig(isVerbose);
  const inputSchemas = await loadSchemas(config.schemaPath, isVerbose);
  const database = await loadDbml(PRISMA_DBML_FILE_PATH, isVerbose);
  const outputSchemas = reconcile(inputSchemas, database, isVerbose);

  // Ensure the output directory exists
  await fs.promises.mkdir(config.outputPath, { recursive: true });

  // Generate new YAML files
  const functions = outputSchemas.map(
    (schema) => () => generateOne(schema, config.outputPath, isVerbose)
  );
  await sequential(functions);
}

async function main(argv) {
  const isVerbose = argv.includes("--verbose") || argv.includes("-v");
  await generate(isVerbose);
  console.log("[AIREXT/INFO] Task completed.");
}

main(process.argv.slice(2)).catch((error) => console.error(error));
